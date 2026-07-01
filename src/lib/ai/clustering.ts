import { prisma } from "@/lib/prisma";
import { setClusterCentroid } from "@/lib/vector";
import { mulberry32 } from "@/lib/ingestion/rng";
import { TOPIC_TAXONOMY } from "@/lib/domain/spotify";

interface EmbeddedReview {
  id: string;
  embedding: number[];
  topicSlug: string | null;
  sentimentScore: number | null;
  intentSummary: string | null;
}

function parseVectorLiteral(literal: string): number[] {
  return literal
    .slice(1, -1)
    .split(",")
    .map(Number);
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(dot(v, v)) || 1;
  return v.map((x) => x / norm);
}

async function loadEmbeddedReviews(limit: number): Promise<EmbeddedReview[]> {
  const rows = await prisma.$queryRawUnsafe<
    { id: string; embedding: string; topicSlug: string | null; sentimentScore: number | null; intentSummary: string | null }[]
  >(
    `
    SELECT r.id, r."embedding"::text as embedding, r."sentimentScore", r."intentSummary",
      (SELECT t.slug FROM "ReviewTopic" rt JOIN "Topic" t ON t.id = rt."topicId" WHERE rt."reviewId" = r.id AND rt."isPrimary" = true LIMIT 1) as "topicSlug"
    FROM "Review" r
    WHERE r."embedding" IS NOT NULL AND r."isDuplicate" = false AND r."processingStatus" = 'PROCESSED'
    ORDER BY r."publishedAt" DESC
    LIMIT $1
    `,
    limit
  );
  return rows.map((r) => ({ ...r, embedding: normalize(parseVectorLiteral(r.embedding)) }));
}

/** Simple cosine k-means over recent review embeddings, run periodically as part of the ETL pipeline. */
export async function runClustering(limit = 3000, k?: number): Promise<{ clusters: number; assigned: number }> {
  const reviews = await loadEmbeddedReviews(limit);
  if (reviews.length < 10) return { clusters: 0, assigned: 0 };

  const numClusters = k ?? Math.max(4, Math.min(16, Math.round(Math.sqrt(reviews.length / 2))));
  const rng = mulberry32(7);
  const dims = reviews[0].embedding.length;

  // k-means++ style seeding: pick first centroid randomly, rest by distance weighting
  const centroids: number[][] = [reviews[Math.floor(rng() * reviews.length)].embedding];
  while (centroids.length < numClusters) {
    const distances = reviews.map((r) => 1 - Math.max(...centroids.map((c) => dot(r.embedding, c))));
    const total = distances.reduce((a, b) => a + b, 0) || 1;
    let target = rng() * total;
    let idx = 0;
    for (; idx < distances.length; idx++) {
      target -= distances[idx];
      if (target <= 0) break;
    }
    centroids.push(reviews[Math.min(idx, reviews.length - 1)].embedding);
  }

  let assignments = new Array(reviews.length).fill(0);
  for (let iter = 0; iter < 8; iter++) {
    assignments = reviews.map((r) => {
      let best = 0;
      let bestScore = -Infinity;
      centroids.forEach((c, ci) => {
        const score = dot(r.embedding, c);
        if (score > bestScore) {
          bestScore = score;
          best = ci;
        }
      });
      return best;
    });

    for (let ci = 0; ci < numClusters; ci++) {
      const members = reviews.filter((_, i) => assignments[i] === ci);
      if (members.length === 0) continue;
      const sum = new Array(dims).fill(0);
      for (const m of members) for (let d = 0; d < dims; d++) sum[d] += m.embedding[d];
      centroids[ci] = normalize(sum.map((v) => v / members.length));
    }
  }

  await prisma.review.updateMany({ data: { clusterId: null } });
  await prisma.cluster.deleteMany({});

  let assigned = 0;
  for (let ci = 0; ci < numClusters; ci++) {
    const memberIdx = assignments.map((a, i) => (a === ci ? i : -1)).filter((i) => i >= 0);
    if (memberIdx.length === 0) continue;
    const members = memberIdx.map((i) => reviews[i]);
    const avgSentiment = members.reduce((s, m) => s + (m.sentimentScore ?? 0), 0) / members.length;
    const topicCounts = new Map<string, number>();
    for (const m of members) if (m.topicSlug) topicCounts.set(m.topicSlug, (topicCounts.get(m.topicSlug) ?? 0) + 1);
    const topTopicSlug = [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topicMeta = TOPIC_TAXONOMY.find((t) => t.slug === topTopicSlug);
    const label = topicMeta ? `${topicMeta.name} cluster` : `Cluster ${ci + 1}`;
    const summary = members[0]?.intentSummary ?? undefined;

    const cluster = await prisma.cluster.create({
      data: {
        label,
        description: topicMeta?.description,
        summary,
        size: members.length,
        avgSentiment,
        trendDirection: avgSentiment < -0.1 ? "FALLING" : avgSentiment > 0.1 ? "RISING" : "STABLE",
        representativeReviewIds: members.slice(0, 5).map((m) => m.id),
      },
    });
    await setClusterCentroid(cluster.id, centroids[ci]);
    await prisma.review.updateMany({
      where: { id: { in: members.map((m) => m.id) } },
      data: { clusterId: cluster.id },
    });
    assigned += members.length;
  }

  return { clusters: numClusters, assigned };
}

import { prisma } from "@/lib/prisma";

/** Serializes a float array into the pgvector text literal format, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function setReviewEmbedding(reviewId: string, embedding: number[]) {
  await prisma.$executeRawUnsafe(
    `UPDATE "Review" SET "embedding" = $1::vector WHERE "id" = $2`,
    toVectorLiteral(embedding),
    reviewId
  );
}

export async function setClusterCentroid(clusterId: string, embedding: number[]) {
  await prisma.$executeRawUnsafe(
    `UPDATE "Cluster" SET "centroid" = $1::vector WHERE "id" = $2`,
    toVectorLiteral(embedding),
    clusterId
  );
}

export interface SimilarReview {
  id: string;
  cleanText: string | null;
  originalText: string;
  source: string;
  externalUrl: string | null;
  publishedAt: Date;
  sentimentLabel: string | null;
  country: string | null;
  similarity: number;
}

/**
 * Cosine-similarity nearest-neighbour search over Review.embedding using the
 * pgvector HNSW index. `1 - (embedding <=> query)` converts cosine distance
 * to a similarity score in [0, 1] for easier consumption downstream.
 */
export async function findSimilarReviews(
  queryEmbedding: number[],
  limit = 8,
  minSimilarity = 0.5
): Promise<SimilarReview[]> {
  const literal = toVectorLiteral(queryEmbedding);
  const rows = await prisma.$queryRawUnsafe<SimilarReview[]>(
    `
    SELECT
      id, "cleanText", "originalText", source::text as source, "externalUrl",
      "publishedAt", "sentimentLabel"::text as "sentimentLabel", country,
      1 - ("embedding" <=> $1::vector) as similarity
    FROM "Review"
    WHERE "embedding" IS NOT NULL AND "isDuplicate" = false
    ORDER BY "embedding" <=> $1::vector ASC
    LIMIT $2
    `,
    literal,
    limit
  );
  return rows.filter((r) => r.similarity >= minSimilarity);
}

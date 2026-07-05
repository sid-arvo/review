import { prisma } from "@/lib/prisma";
import { filtersToWhere, type DashboardFilters } from "@/lib/filters";
import { Prisma, SentimentLabel } from "@prisma/client";

export async function getOverviewMetrics(filters: DashboardFilters) {
  const where = filtersToWhere(filters);
  const priorWhere: Prisma.ReviewWhereInput = {
    ...where,
    publishedAt: {
      gte: new Date(Date.now() - (filters.days ?? 90) * 2 * 86_400_000),
      lt: new Date(Date.now() - (filters.days ?? 90) * 86_400_000),
    },
  };

  const [current, prior, featureRequestCount, painPointCount, activeSources] = await Promise.all([
    prisma.review.aggregate({ where, _avg: { sentimentScore: true }, _count: true }),
    prisma.review.aggregate({ where: priorWhere, _avg: { sentimentScore: true }, _count: true }),
    prisma.review.count({ where: { ...where, isFeatureRequest: true } }),
    prisma.review.count({ where: { ...where, isPainPoint: true } }),
    prisma.review.findMany({ where, select: { source: true }, distinct: ["source"] }),
  ]);

  return {
    totalReviews: current._count,
    avgSentiment: current._avg.sentimentScore ?? 0,
    priorAvgSentiment: prior._avg.sentimentScore ?? 0,
    sentimentDelta: (current._avg.sentimentScore ?? 0) - (prior._avg.sentimentScore ?? 0),
    volumeDelta: prior._count > 0 ? ((current._count - prior._count) / prior._count) * 100 : 0,
    featureRequestCount,
    painPointCount,
    activeSourceCount: activeSources.length,
  };
}

export async function getSentimentTrendSeries(filters: DashboardFilters) {
  const where = filtersToWhere(filters);
  const rows = await prisma.$queryRaw<
    { date: Date; positive: bigint; negative: bigint; neutral: bigint; avgSentiment: number | null }[]
  >(Prisma.sql`
    SELECT date_trunc('day', "publishedAt") as date,
      count(*) filter (where "sentimentLabel" in ('POSITIVE','VERY_POSITIVE')) as positive,
      count(*) filter (where "sentimentLabel" in ('NEGATIVE','VERY_NEGATIVE')) as negative,
      count(*) filter (where "sentimentLabel" = 'NEUTRAL') as neutral,
      avg("sentimentScore") as "avgSentiment"
    FROM "Review"
    WHERE ${buildRawWhere(where)}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  return rows.map((r) => ({
    date: r.date.toISOString().slice(5, 10),
    positive: Number(r.positive),
    negative: Number(r.negative),
    neutral: Number(r.neutral),
    avgSentiment: Number(r.avgSentiment ?? 0),
  }));
}

// Minimal safe raw-SQL WHERE builder mirroring filtersToWhere, since Prisma.sql
// needs composable fragments rather than a Prisma.ReviewWhereInput object.
function buildRawWhere(where: Prisma.ReviewWhereInput): Prisma.Sql {
  const clauses: Prisma.Sql[] = [Prisma.sql`"isDuplicate" = false`, Prisma.sql`"processingStatus" = 'PROCESSED'`];
  if (where.source) clauses.push(Prisma.sql`"source" = ${where.source}::"SourceType"`);
  if (where.country) clauses.push(Prisma.sql`"country" = ${where.country}`);
  if (where.language) clauses.push(Prisma.sql`"language" = ${where.language}`);
  if (where.sentimentLabel) clauses.push(Prisma.sql`"sentimentLabel" = ${where.sentimentLabel}::"SentimentLabel"`);
  if (where.publishedAt && typeof where.publishedAt === "object" && "gte" in where.publishedAt) {
    clauses.push(Prisma.sql`"publishedAt" >= ${where.publishedAt.gte}`);
  }
  return Prisma.join(clauses, " AND ");
}

export async function getSurfaceHealth(filters: DashboardFilters) {
  const where = filtersToWhere(filters);
  const rows = await prisma.$queryRaw<{ surface: string; volume: bigint; avgSentiment: number | null }[]>(Prisma.sql`
    SELECT rrs.surface::text as surface, count(*) as volume, avg(r."sentimentScore") as "avgSentiment"
    FROM "Review" r
    JOIN "ReviewRecommendationSurface" rrs ON rrs."reviewId" = r.id
    WHERE ${buildRawWhere(where)}
    GROUP BY 1
    HAVING count(*) >= 2
    ORDER BY avg(r."sentimentScore") ASC
  `);
  return rows.map((r) => ({ surface: r.surface, volume: Number(r.volume), avgSentiment: Number(r.avgSentiment ?? 0) }));
}

export async function getTopicBreakdown(filters: DashboardFilters) {
  const where = filtersToWhere(filters);
  const rows = await prisma.$queryRaw<{ topic: string; slug: string; color: string | null; volume: bigint; avgSentiment: number | null }[]>(Prisma.sql`
    SELECT t.name as topic, t.slug, t.color, count(*) as volume, avg(r."sentimentScore") as "avgSentiment"
    FROM "Review" r
    JOIN "ReviewTopic" rt ON rt."reviewId" = r.id AND rt."isPrimary" = true
    JOIN "Topic" t ON t.id = rt."topicId"
    WHERE ${buildRawWhere(where)}
    GROUP BY 1, 2, 3
    ORDER BY count(*) DESC
  `);
  return rows.map((r) => ({ topic: r.topic, slug: r.slug, color: r.color ?? "var(--chart-1)", volume: Number(r.volume), avgSentiment: Number(r.avgSentiment ?? 0) }));
}

export async function getPersonaBreakdown(filters: DashboardFilters) {
  const where = filtersToWhere(filters);
  return prisma.persona.findMany({
    include: {
      _count: { select: { reviews: { where } } },
    },
    orderBy: { name: "asc" },
  }).then((personas) =>
    personas
      .map((p) => ({ ...p, count: p._count.reviews }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count)
  );
}

export async function getFeatureRequests(limit = 20) {
  const requests = await prisma.featureRequest.findMany({
    include: { _count: { select: { mentions: true } }, mentions: { take: 1, include: { review: true } } },
    orderBy: { mentions: { _count: "desc" } },
    take: limit,
  });
  return requests.map((r) => ({ ...r, mentionCount: r._count.mentions, sample: r.mentions[0]?.review }));
}

export async function getPainPoints(limit = 20) {
  const points = await prisma.painPoint.findMany({
    include: { _count: { select: { mentions: true } }, mentions: { take: 1, include: { review: true } } },
    orderBy: { mentions: { _count: "desc" } },
    take: limit,
  });
  return points.map((p) => ({ ...p, mentionCount: p._count.mentions, sample: p.mentions[0]?.review }));
}

export async function getLatestExecutiveSummary() {
  return prisma.executiveSummary.findFirst({ orderBy: { createdAt: "desc" } });
}

export async function getSentimentDistribution(filters: DashboardFilters) {
  const where = filtersToWhere(filters);
  const rows = await prisma.review.groupBy({ by: ["sentimentLabel"], where, _count: true });
  const order: SentimentLabel[] = [
    SentimentLabel.VERY_NEGATIVE,
    SentimentLabel.NEGATIVE,
    SentimentLabel.NEUTRAL,
    SentimentLabel.POSITIVE,
    SentimentLabel.VERY_POSITIVE,
  ];
  return order.map((label) => ({
    label,
    count: rows.find((r) => r.sentimentLabel === label)?._count ?? 0,
  }));
}

export async function getEmotionBreakdown(filters: DashboardFilters) {
  const where = filtersToWhere(filters);
  const reviews = await prisma.review.findMany({ where, select: { emotions: true }, take: 5000 });
  const totals = new Map<string, number>();
  for (const r of reviews) {
    const emotions = r.emotions as Record<string, number> | null;
    if (!emotions) continue;
    for (const [emotion, score] of Object.entries(emotions)) {
      totals.set(emotion, (totals.get(emotion) ?? 0) + score);
    }
  }
  return Array.from(totals.entries())
    .map(([emotion, total]) => ({ emotion, total }))
    .sort((a, b) => b.total - a.total);
}

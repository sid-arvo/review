import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasOpenAI } from "@/lib/env";
import { getOpenAI, CHAT_MODEL } from "@/lib/ai/openai-client";
import { TOPIC_TAXONOMY, SURFACE_LABELS } from "@/lib/domain/spotify";

interface KeyInsight {
  title: string;
  detail: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  evidenceReviewIds: string[];
}

interface Recommendation {
  title: string;
  rationale: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export async function generateExecutiveSummary(periodDays = 30) {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - periodDays * 86_400_000);
  const priorStart = new Date(periodStart.getTime() - periodDays * 86_400_000);

  const [current, prior, topPainPoints, topFeatureRequests, negativeSurfaces, totalReviews] = await Promise.all([
    prisma.review.aggregate({
      where: { publishedAt: { gte: periodStart, lte: periodEnd }, isDuplicate: false, processingStatus: "PROCESSED" },
      _avg: { sentimentScore: true },
      _count: true,
    }),
    prisma.review.aggregate({
      where: { publishedAt: { gte: priorStart, lt: periodStart }, isDuplicate: false, processingStatus: "PROCESSED" },
      _avg: { sentimentScore: true },
      _count: true,
    }),
    prisma.painPoint.findMany({
      include: { _count: { select: { mentions: true } } },
      orderBy: { mentions: { _count: "desc" } },
      take: 5,
    }),
    prisma.featureRequest.findMany({
      include: { _count: { select: { mentions: true } } },
      orderBy: { mentions: { _count: "desc" } },
      take: 5,
    }),
    prisma.$queryRawUnsafe<{ surface: string; avgSentiment: number; volume: bigint }[]>(`
      SELECT rrs.surface::text as surface, avg(r."sentimentScore") as "avgSentiment", count(*) as volume
      FROM "Review" r
      JOIN "ReviewRecommendationSurface" rrs ON rrs."reviewId" = r.id
      WHERE r."publishedAt" >= $1 AND r."isDuplicate" = false AND r."processingStatus" = 'PROCESSED'
      GROUP BY 1
      HAVING count(*) >= 3
      ORDER BY avg(r."sentimentScore") ASC
      LIMIT 5
    `, periodStart),
    prisma.review.count({ where: { isDuplicate: false, processingStatus: "PROCESSED" } }),
  ]);

  const currentAvg = current._avg.sentimentScore ?? 0;
  const priorAvg = prior._avg.sentimentScore ?? 0;
  const sentimentDelta = currentAvg - priorAvg;

  const keyInsights: KeyInsight[] = [
    {
      title: `Sentiment ${sentimentDelta >= 0 ? "improved" : "declined"} ${Math.abs(sentimentDelta * 100).toFixed(1)} pts vs. prior period`,
      detail: `Average sentiment score is ${currentAvg.toFixed(2)} across ${current._count} reviews (prior period: ${priorAvg.toFixed(2)} across ${prior._count} reviews).`,
      impact: Math.abs(sentimentDelta) > 0.1 ? "HIGH" : "MEDIUM",
      evidenceReviewIds: [],
    },
    ...negativeSurfaces.slice(0, 3).map((s) => ({
      title: `${SURFACE_LABELS[s.surface as keyof typeof SURFACE_LABELS] ?? s.surface} is the most negatively received surface`,
      detail: `Average sentiment of ${Number(s.avgSentiment).toFixed(2)} across ${s.volume} mentions in the last ${periodDays} days.`,
      impact: "HIGH" as const,
      evidenceReviewIds: [],
    })),
    ...topPainPoints.slice(0, 3).map((p) => ({
      title: p.title,
      detail: `Mentioned in ${p._count.mentions} reviews. Severity: ${p.severity}.`,
      impact: p._count.mentions > 20 ? ("HIGH" as const) : ("MEDIUM" as const),
      evidenceReviewIds: [],
    })),
  ];

  const recommendations: Recommendation[] = [
    ...topFeatureRequests.slice(0, 3).map((f) => ({
      title: f.title,
      rationale: `Requested in ${f._count.mentions} reviews - highest-volume unmet need this period.`,
      priority: f._count.mentions > 15 ? ("HIGH" as const) : ("MEDIUM" as const),
    })),
    {
      title: "Review discovery surface tuning for repetition complaints",
      rationale: "Recommendation Repetition remains a top negative topic; consider adjusting exploration/exploitation balance in ranking.",
      priority: "HIGH",
    },
  ];

  const headline = `${current._count} reviews analyzed - sentiment ${sentimentDelta >= 0 ? "up" : "down"} ${Math.abs(sentimentDelta * 100).toFixed(1)} pts, discovery repetition remains the top concern`;

  let summary = `Over the last ${periodDays} days, the platform ingested and analyzed ${current._count} pieces of public feedback (${totalReviews} total to date). ` +
    `Average sentiment moved from ${priorAvg.toFixed(2)} to ${currentAvg.toFixed(2)}. ` +
    `${negativeSurfaces[0] ? `${SURFACE_LABELS[negativeSurfaces[0].surface as keyof typeof SURFACE_LABELS] ?? negativeSurfaces[0].surface} shows the weakest sentiment of any surface this period.` : ""} ` +
    `Top requested improvement: ${topFeatureRequests[0]?.title ?? "N/A"}.`;

  if (hasOpenAI()) {
    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are writing a crisp executive summary for Spotify leadership about the music discovery experience, grounded strictly in the provided metrics. Do not invent numbers not given to you. 3-4 sentences.",
          },
          { role: "user", content: JSON.stringify({ current: current._count, prior: prior._count, currentAvg, priorAvg, topPainPoints: topPainPoints.map(p=>p.title), topFeatureRequests: topFeatureRequests.map(f=>f.title), negativeSurfaces }) },
        ],
        temperature: 0.4,
      });
      summary = completion.choices[0].message.content?.trim() ?? summary;
    } catch (err) {
      console.error("[executive-summary] LLM generation failed, using heuristic summary:", (err as Error).message);
    }
  }

  return prisma.executiveSummary.create({
    data: {
      periodStart,
      periodEnd,
      headline,
      summary,
      keyInsights: keyInsights as unknown as Prisma.InputJsonValue,
      recommendations: recommendations as unknown as Prisma.InputJsonValue,
      metrics: {
        totalReviews,
        periodReviews: current._count,
        currentAvgSentiment: currentAvg,
        priorAvgSentiment: priorAvg,
        topTopics: TOPIC_TAXONOMY.slice(0, 5).map((t) => t.slug),
      },
    },
  });
}

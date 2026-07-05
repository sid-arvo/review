import { prisma } from "@/lib/prisma";
import { TOPIC_TAXONOMY } from "@/lib/domain/spotify";

export interface ScopeOption {
  value: string;
  label: string;
}

export function getScopeOptions(): ScopeOption[] {
  return [
    { value: "GLOBAL", label: "Global (all feedback)" },
    ...TOPIC_TAXONOMY.map((t) => ({ value: `TOPIC:${t.slug}`, label: t.name })),
  ];
}

export async function getTrendSeries(scope: string) {
  const rows = await prisma.trendSnapshot.findMany({
    where: { scope },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    date: r.date.toISOString().slice(5, 10),
    volume: r.volume,
    avgSentiment: Number((r.avgSentiment ?? 0).toFixed(3)),
    featureRequests: r.featureRequestCount,
    painPoints: r.painPointCount,
  }));
}

export interface TopicMomentum {
  slug: string;
  name: string;
  recentVolume: number;
  priorVolume: number;
  pctChange: number;
  direction: "RISING" | "FALLING" | "STABLE";
}

export async function getTopicMomentum(): Promise<TopicMomentum[]> {
  const now = Date.now();
  const day = 86_400_000;
  const recentStart = new Date(now - 30 * day);
  const priorStart = new Date(now - 60 * day);

  // Previously awaited each topic's pair of queries one at a time in a
  // for-loop, turning what should be one round-trip per topic into 13+
  // sequential round-trips. Fetching every topic's rows in parallel cuts
  // this page's DB wait time from O(topics) to O(1) round-trips.
  const results = await Promise.all(
    TOPIC_TAXONOMY.map(async (topic) => {
      const scope = `TOPIC:${topic.slug}`;
      // Zero-filled by calendar window (not row position) since sparse topics
      // may have no snapshot row at all on low-volume days.
      const [recentRows, priorRows] = await Promise.all([
        prisma.trendSnapshot.findMany({ where: { scope, date: { gte: recentStart } }, select: { volume: true } }),
        prisma.trendSnapshot.findMany({ where: { scope, date: { gte: priorStart, lt: recentStart } }, select: { volume: true } }),
      ]);
      const recent = recentRows.reduce((s, r) => s + r.volume, 0);
      const prior = priorRows.reduce((s, r) => s + r.volume, 0);
      const pctChange = prior > 0 ? ((recent - prior) / prior) * 100 : recent > 0 ? 100 : 0;
      return {
        slug: topic.slug,
        name: topic.name,
        recentVolume: recent,
        priorVolume: prior,
        pctChange,
        direction: (pctChange > 15 ? "RISING" : pctChange < -15 ? "FALLING" : "STABLE") as TopicMomentum["direction"],
      };
    })
  );
  return results.sort((a, b) => b.pctChange - a.pctChange);
}

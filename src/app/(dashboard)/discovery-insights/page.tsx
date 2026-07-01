import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { HorizontalBarChart } from "@/components/charts/bar-chart";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { parseFilters, filtersToWhere, type SearchParams } from "@/lib/filters";
import { getTopicBreakdown, getSentimentTrendSeries } from "@/lib/queries/dashboard";
import { prisma } from "@/lib/prisma";
import { SENTIMENT_LABELS } from "@/lib/domain/sentiment";
import { Compass } from "lucide-react";

const DISCOVERY_TOPIC_SLUGS = ["music-discovery", "recommendation-repetition", "personalization-accuracy"];

export default async function DiscoveryInsightsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const where = filtersToWhere(filters);
  const discoveryWhere = { ...where, topics: { some: { topic: { slug: { in: DISCOVERY_TOPIC_SLUGS } } } } };

  const [options, topics, trend, discoveryStats, negativeCount, quotes] = await Promise.all([
    getFilterOptions(),
    getTopicBreakdown(filters),
    getSentimentTrendSeries({ ...filters, topic: filters.topic ?? "music-discovery" }),
    prisma.review.aggregate({ where: discoveryWhere, _count: true, _avg: { sentimentScore: true } }),
    prisma.review.count({ where: { ...discoveryWhere, sentimentLabel: { in: ["NEGATIVE", "VERY_NEGATIVE"] } } }),
    prisma.review.findMany({
      where: { ...discoveryWhere, sentimentLabel: { in: ["NEGATIVE", "VERY_NEGATIVE"] } },
      orderBy: { publishedAt: "desc" },
      take: 6,
      select: { id: true, originalText: true, source: true, country: true, sentimentLabel: true, publishedAt: true },
    }),
  ]);

  const discoveryTopics = topics.filter((t) => DISCOVERY_TOPIC_SLUGS.includes(t.slug));
  const barData = discoveryTopics.map((t) => ({ label: t.topic, value: t.volume, color: t.color }));
  const negativeShare = discoveryStats._count > 0 ? Math.round((negativeCount / discoveryStats._count) * 100) : 0;

  return (
    <PageShell
      title="Music Discovery Insights"
      description="Why users struggle to discover new music despite advanced recommendations"
      actions={<FilterBar options={options} showTopic={false} />}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Discovery-related feedback" value={String(discoveryStats._count)} icon={Compass} />
        <KpiCard label="Avg sentiment (discovery topics)" value={(discoveryStats._avg.sentimentScore ?? 0).toFixed(2)} />
        <KpiCard label="Share negative" value={`${negativeShare}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Discovery topic volume</CardTitle>
            <CardDescription>Music Discovery, Repetition & Personalization Accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={barData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Discovery sentiment over time</CardTitle>
            <CardDescription>Music Discovery topic trend</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={trend}
              series={[
                { key: "positive", label: "Positive", color: "var(--chart-1)" },
                { key: "negative", label: "Negative", color: "var(--destructive)" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Representative negative feedback</CardTitle>
          <CardDescription>Recent quotes describing discovery friction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {quotes.map((q) => (
            <div key={q.id} className="rounded-lg border p-3 text-sm">
              <p>&ldquo;{q.originalText}&rdquo;</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{q.source}</Badge>
                {q.country && <span>{q.country}</span>}
                <span>{new Date(q.publishedAt).toLocaleDateString()}</span>
                <Badge variant="destructive" className="ml-auto">
                  {SENTIMENT_LABELS[q.sentimentLabel!]}
                </Badge>
              </div>
            </div>
          ))}
          {quotes.length === 0 && <p className="text-sm text-muted-foreground">No matching feedback for current filters.</p>}
        </CardContent>
      </Card>
    </PageShell>
  );
}

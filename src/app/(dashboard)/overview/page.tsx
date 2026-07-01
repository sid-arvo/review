import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { HorizontalBarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { parseFilters, type SearchParams } from "@/lib/filters";
import {
  getOverviewMetrics,
  getSentimentTrendSeries,
  getSurfaceHealth,
  getLatestExecutiveSummary,
  getFeatureRequests,
  getPainPoints,
} from "@/lib/queries/dashboard";
import { SURFACE_LABELS } from "@/lib/domain/spotify";
import { formatNumber } from "@/lib/utils";
import { MessageSquareWarning, Lightbulb, Users2, TrendingUp } from "lucide-react";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [options, metrics, trend, surfaceHealth, summary, topFeatureRequests, topPainPoints] = await Promise.all([
    getFilterOptions(),
    getOverviewMetrics(filters),
    getSentimentTrendSeries(filters),
    getSurfaceHealth(filters),
    getLatestExecutiveSummary(),
    getFeatureRequests(5),
    getPainPoints(5),
  ]);

  const worstSurfaces = surfaceHealth.slice(0, 6).map((s) => ({
    label: SURFACE_LABELS[s.surface as keyof typeof SURFACE_LABELS] ?? s.surface,
    value: s.volume,
    color: s.avgSentiment < -0.1 ? "var(--destructive)" : "var(--chart-4)",
  }));

  return (
    <PageShell
      title="Executive Overview"
      description="Spotify discovery experience health at a glance"
      actions={<FilterBar options={options} />}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Reviews analyzed" value={formatNumber(metrics.totalReviews)} delta={metrics.volumeDelta} deltaLabel="% vs prior period" icon={TrendingUp} />
        <KpiCard
          label="Avg sentiment score"
          value={metrics.avgSentiment.toFixed(2)}
          delta={metrics.sentimentDelta * 100}
          deltaLabel=" pts vs prior period"
          icon={MessageSquareWarning}
        />
        <KpiCard label="Feature requests" value={formatNumber(metrics.featureRequestCount)} icon={Lightbulb} />
        <KpiCard label="Pain points flagged" value={formatNumber(metrics.painPointCount)} icon={Users2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sentiment trend</CardTitle>
            <CardDescription>Daily positive / negative / neutral volume</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={trend}
              series={[
                { key: "positive", label: "Positive", color: "var(--chart-1)" },
                { key: "negative", label: "Negative", color: "var(--destructive)" },
                { key: "neutral", label: "Neutral", color: "var(--muted-foreground)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most-discussed surfaces</CardTitle>
            <CardDescription>By feedback volume, tinted by sentiment</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={worstSurfaces} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {summary && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Latest AI executive summary</CardTitle>
              <CardDescription>
                {new Date(summary.periodStart).toLocaleDateString()} - {new Date(summary.periodEnd).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{summary.headline}</p>
              <p className="text-muted-foreground">{summary.summary}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top feature requests</CardTitle>
            <CardDescription>Ranked by mention volume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topFeatureRequests.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{f.title}</span>
                <Badge variant="secondary">{f.mentionCount}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top pain points</CardTitle>
            <CardDescription>Ranked by mention volume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPainPoints.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{p.title}</span>
                <Badge variant="destructive">{p.mentionCount}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Showing data from the last {filters.days} days across {metrics.activeSourceCount} active sources.</p>
    </PageShell>
  );
}

import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBarChart } from "@/components/charts/bar-chart";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getSentimentDistribution, getEmotionBreakdown, getSentimentTrendSeries } from "@/lib/queries/dashboard";
import { SENTIMENT_LABELS, SENTIMENT_COLORS, EMOTION_COLORS } from "@/lib/domain/sentiment";
import { titleCase } from "@/lib/utils";

export default async function SentimentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [options, distribution, emotions, trend] = await Promise.all([
    getFilterOptions(),
    getSentimentDistribution(filters),
    getEmotionBreakdown(filters),
    getSentimentTrendSeries(filters),
  ]);

  const donutData = distribution
    .filter((d) => d.count > 0)
    .map((d) => ({ label: SENTIMENT_LABELS[d.label], value: d.count, color: SENTIMENT_COLORS[d.label] }));

  const emotionData = emotions.map((e) => ({
    label: titleCase(e.emotion),
    value: Number(e.total.toFixed(1)),
    color: EMOTION_COLORS[e.emotion] ?? "var(--chart-2)",
  }));

  return (
    <PageShell
      title="Sentiment Analysis"
      description="Sentiment and emotion breakdown across all feedback"
      actions={<FilterBar options={options} />}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment distribution</CardTitle>
            <CardDescription>Share of feedback by sentiment label</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={donutData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Emotion signal</CardTitle>
            <CardDescription>Aggregated emotion intensity detected across feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={emotionData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sentiment over time</CardTitle>
          <CardDescription>Daily volume split by polarity</CardDescription>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            data={trend}
            series={[
              { key: "positive", label: "Positive", color: "var(--chart-1)" },
              { key: "neutral", label: "Neutral", color: "var(--muted-foreground)" },
              { key: "negative", label: "Negative", color: "var(--destructive)" },
            ]}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}

import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getTopicBreakdown } from "@/lib/queries/dashboard";

export default async function TopicsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [options, topics] = await Promise.all([getFilterOptions(), getTopicBreakdown(filters)]);
  const maxVolume = Math.max(1, ...topics.map((t) => t.volume));

  return (
    <PageShell
      title="Topic Explorer"
      description="Drill into every topic surfaced from user feedback"
      actions={<FilterBar options={options} showTopic={false} />}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((t) => (
          <Link key={t.slug} href={`/reviews?topic=${t.slug}`}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{t.topic}</CardTitle>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">{t.volume}</span>
                  <Badge variant={t.avgSentiment < -0.1 ? "destructive" : t.avgSentiment > 0.1 ? "default" : "secondary"}>
                    {t.avgSentiment.toFixed(2)}
                  </Badge>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${(t.volume / maxVolume) * 100}%`, backgroundColor: t.color }}
                  />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {topics.length === 0 && <p className="text-sm text-muted-foreground">No topics match the current filters.</p>}
      </div>
    </PageShell>
  );
}

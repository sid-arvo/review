import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { HorizontalBarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getSurfaceHealth } from "@/lib/queries/dashboard";
import { SURFACE_LABELS, DISCOVERY_SURFACES } from "@/lib/domain/spotify";

export default async function RecommendationHealthPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [options, surfaceHealth] = await Promise.all([getFilterOptions(), getSurfaceHealth(filters)]);

  const chartData = [...surfaceHealth]
    .sort((a, b) => a.avgSentiment - b.avgSentiment)
    .map((s) => ({
      label: SURFACE_LABELS[s.surface as keyof typeof SURFACE_LABELS] ?? s.surface,
      value: Number(s.avgSentiment.toFixed(2)),
      color: s.avgSentiment < -0.1 ? "var(--destructive)" : s.avgSentiment > 0.1 ? "var(--chart-1)" : "var(--chart-4)",
    }));

  return (
    <PageShell
      title="Recommendation Health"
      description="Sentiment and volume across every recommendation surface"
      actions={<FilterBar options={options} showSurface={false} />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Average sentiment by surface</CardTitle>
          <CardDescription>Negative values indicate net-negative feedback for that surface</CardDescription>
        </CardHeader>
        <CardContent>
          <HorizontalBarChart data={chartData} height={Math.max(300, chartData.length * 30)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Surface detail</CardTitle>
          <CardDescription>Ranked worst to best</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Surface</TableHead>
                <TableHead>Discovery surface</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Avg sentiment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surfaceHealth.map((s) => (
                <TableRow key={s.surface}>
                  <TableCell className="font-medium">{SURFACE_LABELS[s.surface as keyof typeof SURFACE_LABELS] ?? s.surface}</TableCell>
                  <TableCell>
                    {DISCOVERY_SURFACES.includes(s.surface as never) && <Badge variant="secondary">Discovery</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{s.volume}</TableCell>
                  <TableCell className="text-right">
                    <span className={s.avgSentiment < -0.1 ? "text-destructive" : s.avgSentiment > 0.1 ? "text-primary" : ""}>
                      {s.avgSentiment.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

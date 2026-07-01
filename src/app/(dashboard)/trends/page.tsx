import { PageShell } from "@/components/layout/page-shell";
import { ScopeSelect } from "@/components/dashboard/scope-select";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getScopeOptions, getTrendSeries, getTopicMomentum } from "@/lib/queries/trends";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { SearchParams } from "@/lib/filters";

const DIRECTION_META = {
  RISING: { icon: ArrowUp, className: "text-destructive" },
  FALLING: { icon: ArrowDown, className: "text-primary" },
  STABLE: { icon: Minus, className: "text-muted-foreground" },
};

export default async function TrendsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const scope = (Array.isArray(params.scope) ? params.scope[0] : params.scope) ?? "GLOBAL";
  const options = getScopeOptions();

  const [series, momentum] = await Promise.all([getTrendSeries(scope), getTopicMomentum()]);

  return (
    <PageShell
      title="Trend Analysis"
      description="What's rising and falling over time across topics"
      actions={<ScopeSelect options={options} defaultValue="GLOBAL" />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Volume & sentiment history</CardTitle>
          <CardDescription>{options.find((o) => o.value === scope)?.label}</CardDescription>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            data={series}
            series={[{ key: "volume", label: "Volume", color: "var(--chart-2)" }]}
            variant="line"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topic momentum</CardTitle>
          <CardDescription>Last 30 days vs. prior 30 days, by topic</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="text-right">Last 30d</TableHead>
                <TableHead className="text-right">Prior 30d</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Direction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {momentum.map((m) => {
                const meta = DIRECTION_META[m.direction];
                const Icon = meta.icon;
                return (
                  <TableRow key={m.slug}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-right">{m.recentVolume}</TableCell>
                    <TableCell className="text-right">{m.priorVolume}</TableCell>
                    <TableCell className={`text-right ${meta.className}`}>{m.pctChange.toFixed(0)}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                        <Icon className="size-3" /> {m.direction}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

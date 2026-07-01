import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { HorizontalBarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getCountryBreakdown } from "@/lib/queries/dashboard";
import { COUNTRY_NAMES } from "@/lib/domain/spotify";

export default async function GeographyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [options, countries] = await Promise.all([getFilterOptions(), getCountryBreakdown(filters)]);

  const chartData = countries.slice(0, 12).map((c) => ({
    label: COUNTRY_NAMES[c.country] ?? c.country,
    value: c.volume,
    color: c.avgSentiment < -0.1 ? "var(--destructive)" : c.avgSentiment > 0.1 ? "var(--chart-1)" : "var(--chart-4)",
  }));

  return (
    <PageShell
      title="Geographic Trends"
      description="Feedback volume and sentiment by country"
      actions={<FilterBar options={options} />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Volume by country</CardTitle>
          <CardDescription>Top 12 countries by feedback volume, tinted by sentiment</CardDescription>
        </CardHeader>
        <CardContent>
          <HorizontalBarChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Country detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Avg sentiment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.map((c) => (
                <TableRow key={c.country}>
                  <TableCell className="font-medium">{COUNTRY_NAMES[c.country] ?? c.country}</TableCell>
                  <TableCell className="text-right">{c.volume}</TableCell>
                  <TableCell className="text-right">
                    <span className={c.avgSentiment < -0.1 ? "text-destructive" : c.avgSentiment > 0.1 ? "text-primary" : ""}>
                      {c.avgSentiment.toFixed(2)}
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

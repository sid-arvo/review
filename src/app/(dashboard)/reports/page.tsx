import { PageShell } from "@/components/layout/page-shell";
import { GenerateReportButton } from "@/components/dashboard/generate-report-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

interface KeyInsight { title: string; detail: string; impact: string }
interface Recommendation { title: string; rationale: string; priority: string }

export default async function ReportsPage() {
  const summaries = await prisma.executiveSummary.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <PageShell
      title="Reports"
      description="AI-generated executive summaries grounded in the underlying metrics"
      actions={<GenerateReportButton />}
    >
      <div className="space-y-4">
        {summaries.map((s) => {
          const insights = s.keyInsights as unknown as KeyInsight[];
          const recommendations = s.recommendations as unknown as Recommendation[];
          return (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-base">{s.headline}</CardTitle>
                <CardDescription>
                  {new Date(s.periodStart).toLocaleDateString()} - {new Date(s.periodEnd).toLocaleDateString()} · Generated{" "}
                  {new Date(s.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{s.summary}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Key insights</h4>
                    <ul className="space-y-2">
                      {insights?.map((i, idx) => (
                        <li key={idx} className="rounded-md border p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{i.title}</span>
                            <Badge variant={i.impact === "HIGH" ? "destructive" : "secondary"} className="text-[10px]">
                              {i.impact}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recommendations</h4>
                    <ul className="space-y-2">
                      {recommendations?.map((r, idx) => (
                        <li key={idx} className="rounded-md border p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{r.title}</span>
                            <Badge variant={r.priority === "HIGH" ? "default" : "secondary"} className="text-[10px]">
                              {r.priority}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{r.rationale}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {summaries.length === 0 && <p className="text-sm text-muted-foreground">No reports generated yet.</p>}
      </div>
    </PageShell>
  );
}

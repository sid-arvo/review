import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { SOURCE_LABELS } from "@/lib/domain/spotify";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUCCESS: "default",
  RUNNING: "secondary",
  FAILED: "destructive",
  PARTIAL: "outline",
};

export default async function CronPage() {
  const runs = await prisma.cronRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { logs: true },
  });

  return (
    <PageShell title="Cron Monitoring" description="Daily ETL pipeline run history and per-source ingestion logs">
      <Card>
        <CardHeader>
          <CardTitle>Job runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {runs.map((run) => (
            <div key={run.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{run.jobName}</span>
                <Badge variant={STATUS_VARIANT[run.status] ?? "secondary"}>{run.status}</Badge>
                <span className="text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</span>
                {run.durationMs != null && <span className="text-muted-foreground">· {(run.durationMs / 1000).toFixed(1)}s</span>}
                {run.stats != null && (
                  <span className="ml-auto text-xs text-muted-foreground">{JSON.stringify(run.stats)}</span>
                )}
              </div>
              {run.error && <p className="mt-2 text-xs text-destructive">{run.error}</p>}
              {run.logs.length > 0 && (
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Fetched</TableHead>
                      <TableHead className="text-right">New</TableHead>
                      <TableHead>Fallback</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{SOURCE_LABELS[log.source] ?? log.source}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"} className="text-[10px]">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{log.itemsFetched}</TableCell>
                        <TableCell className="text-right">{log.itemsNew}</TableCell>
                        <TableCell>
                          {log.usedFallback ? <Badge variant="outline" className="text-[10px]">fallback</Badge> : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{log.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
          {runs.length === 0 && <p className="text-sm text-muted-foreground">No cron runs recorded yet.</p>}
        </CardContent>
      </Card>
    </PageShell>
  );
}

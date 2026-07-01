import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFeatureRequests } from "@/lib/queries/dashboard";
import { SURFACE_LABELS } from "@/lib/domain/spotify";

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CRITICAL: "destructive",
  HIGH: "default",
  MEDIUM: "secondary",
  LOW: "outline",
};

function derivePriority(mentionCount: number): keyof typeof PRIORITY_VARIANT {
  if (mentionCount > 15) return "HIGH";
  if (mentionCount > 5) return "MEDIUM";
  return "LOW";
}

export default async function FeatureRequestsPage() {
  const requests = await getFeatureRequests(50);

  return (
    <PageShell title="Feature Requests" description="What users are asking Spotify to build or improve">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Mentions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-md">
                    <div className="font-medium">{r.title}</div>
                    {r.sample && <div className="mt-1 truncate text-xs text-muted-foreground">&ldquo;{r.sample.originalText}&rdquo;</div>}
                  </TableCell>
                  <TableCell>{r.surface ? SURFACE_LABELS[r.surface] : "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const priority = derivePriority(r.mentionCount);
                      return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-medium">{r.mentionCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

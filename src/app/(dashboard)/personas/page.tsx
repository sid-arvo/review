import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

export default async function PersonasPage() {
  const personas = await prisma.persona.findMany({
    include: {
      reviews: {
        where: { isDuplicate: false, processingStatus: "PROCESSED" },
        select: { sentimentScore: true, originalText: true, topics: { where: { isPrimary: true }, include: { topic: true }, take: 1 } },
      },
    },
  });

  const enriched = personas
    .map((p) => {
      const count = p.reviews.length;
      const avgSentiment = count > 0 ? p.reviews.reduce((s, r) => s + (r.sentimentScore ?? 0), 0) / count : 0;
      const topicCounts = new Map<string, number>();
      for (const r of p.reviews) {
        const name = r.topics[0]?.topic.name;
        if (name) topicCounts.set(name, (topicCounts.get(name) ?? 0) + 1);
      }
      const topTopic = [...topicCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const sample = p.reviews.find((r) => (r.sentimentScore ?? 0) < -0.1)?.originalText ?? p.reviews[0]?.originalText;
      return { ...p, count, avgSentiment, topTopic, sample };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <PageShell title="Personas" description="Discovery challenges segmented by user persona">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {enriched.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color ?? undefined }} />
              </div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">{p.count}</span>
                <span className="text-muted-foreground">reviews</span>
                <Badge variant={p.avgSentiment < -0.1 ? "destructive" : p.avgSentiment > 0.1 ? "default" : "secondary"} className="ml-auto">
                  {p.avgSentiment.toFixed(2)} sentiment
                </Badge>
              </div>
              {p.topTopic && (
                <div className="text-xs text-muted-foreground">
                  Top concern: <span className="text-foreground">{p.topTopic}</span>
                </div>
              )}
              {p.sample && <p className="rounded-md bg-muted/40 p-2 text-xs italic">&ldquo;{p.sample}&rdquo;</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

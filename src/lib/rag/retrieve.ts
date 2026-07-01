import { embedText } from "@/lib/ai/embeddings";
import { findSimilarReviews, type SimilarReview } from "@/lib/vector";
import { SOURCE_LABELS } from "@/lib/domain/spotify";

export interface RetrievedContext {
  citations: SimilarReview[];
  contextBlock: string;
}

export async function retrieveContext(query: string, k = 8): Promise<RetrievedContext> {
  const embedding = await embedText(query);
  const citations = await findSimilarReviews(embedding, k, 0.15);

  const contextBlock = citations
    .map((c, idx) => {
      const source = SOURCE_LABELS[c.source] ?? c.source;
      const date = new Date(c.publishedAt).toISOString().slice(0, 10);
      return `[${idx + 1}] (${source}, ${c.country ?? "unknown"}, ${date}, sentiment: ${c.sentimentLabel ?? "n/a"}): "${(c.cleanText ?? c.originalText).slice(0, 400)}"`;
    })
    .join("\n");

  return { citations, contextBlock };
}

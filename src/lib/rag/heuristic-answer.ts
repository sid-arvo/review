import type { SimilarReview } from "@/lib/vector";
import { SOURCE_LABELS } from "@/lib/domain/spotify";

/**
 * Deterministic extractive answer used when OPENAI_API_KEY is unset, so the
 * chat still returns a grounded, cited response without an LLM call.
 */
export function synthesizeHeuristicAnswer(question: string, citations: SimilarReview[]): string {
  if (citations.length === 0) {
    return "I couldn't find any reviews closely related to that question. Try asking about a specific Spotify feature like Discover Weekly, AI DJ, or recommendation repetition.";
  }

  const sentimentCounts = citations.reduce<Record<string, number>>((acc, c) => {
    const label = c.sentimentLabel ?? "NEUTRAL";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const dominant = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const sourceCounts = new Set(citations.map((c) => SOURCE_LABELS[c.source] ?? c.source));

  const lines: string[] = [];
  lines.push(
    `Based on ${citations.length} related reviews across ${sourceCounts.size} source${sourceCounts.size === 1 ? "" : "s"}, the dominant sentiment is **${(dominant ?? "neutral").toLowerCase().replace("_", " ")}**.`
  );
  lines.push("");
  lines.push("Representative feedback:");
  citations.slice(0, 4).forEach((c, idx) => {
    lines.push(`- [${idx + 1}] "${(c.cleanText ?? c.originalText).slice(0, 220)}"`);
  });
  lines.push("");
  lines.push(
    `_This is a heuristic extractive summary (no OPENAI_API_KEY configured). Set OPENAI_API_KEY to enable full GPT-generated answers grounded in the same retrieved evidence._`
  );

  return lines.join("\n");
}

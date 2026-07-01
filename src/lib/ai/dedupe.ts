import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { findSimilarReviews } from "@/lib/vector";

export function textHash(text: string): string {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

/** Exact-text duplicate check (cross-posted / re-scraped content). */
export async function findExactDuplicate(cleanedText: string, excludeReviewId: string): Promise<string | null> {
  const hash = textHash(cleanedText);
  const candidates = await prisma.review.findMany({
    where: { id: { not: excludeReviewId }, processingStatus: "PROCESSED" },
    select: { id: true, cleanText: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });
  const match = candidates.find((c) => c.cleanText && textHash(c.cleanText) === hash);
  return match?.id ?? null;
}

/** Near-duplicate check via embedding cosine similarity, once the embedding is available. */
export async function findNearDuplicate(embedding: number[], excludeReviewId: string, threshold = 0.985): Promise<string | null> {
  const similar = await findSimilarReviews(embedding, 3, threshold);
  const match = similar.find((r) => r.id !== excludeReviewId);
  return match?.id ?? null;
}

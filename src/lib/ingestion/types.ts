import type { SourceType } from "@prisma/client";

export interface RawReview {
  source: SourceType;
  externalId: string;
  externalUrl?: string;
  authorName?: string;
  authorHandle?: string;
  rating?: number;
  country?: string;
  originalText: string;
  publishedAt: Date;
  rawJson?: unknown;
}

export interface IngestionResult {
  source: SourceType;
  reviews: RawReview[];
  usedFallback: boolean;
  message?: string;
}

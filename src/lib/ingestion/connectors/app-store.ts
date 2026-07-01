import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { fetchJson } from "@/lib/ingestion/http";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";

interface ITunesRssEntry {
  id: { label: string };
  author?: { name?: { label: string } };
  "im:rating"?: { label: string };
  title?: { label: string };
  content?: { label: string };
  updated?: { label: string };
  link?: { attributes?: { href?: string } };
}

interface ITunesRssResponse {
  feed?: { entry?: ITunesRssEntry[] };
}

/**
 * Real, unauthenticated integration: Apple exposes recent App Store customer
 * reviews as a public RSS/JSON feed per app + storefront country. No API key
 * required, so this always runs live rather than falling back.
 */
export async function fetchAppStoreReviews(pageCount = 3): Promise<IngestionResult> {
  const reviews: RawReview[] = [];
  const country = env.APPLE_APP_STORE_COUNTRY;
  const appId = env.APPLE_APP_ID;

  try {
    for (let page = 1; page <= pageCount; page++) {
      const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`;
      const data = await fetchJson<ITunesRssResponse>(url, undefined, 8000);
      const entries = data.feed?.entry?.slice(1) ?? []; // first entry is app metadata, not a review
      for (const entry of entries) {
        const text = entry.content?.label ?? entry.title?.label;
        if (!text) continue;
        reviews.push({
          source: SourceType.APP_STORE,
          externalId: entry.id.label,
          externalUrl: entry.link?.attributes?.href,
          authorName: entry.author?.name?.label,
          rating: entry["im:rating"]?.label ? Number(entry["im:rating"].label) : undefined,
          country: country.toUpperCase(),
          originalText: `${entry.title?.label ? entry.title.label + ". " : ""}${text}`,
          publishedAt: entry.updated?.label ? new Date(entry.updated.label) : new Date(),
          rawJson: entry,
        });
      }
    }

    if (reviews.length === 0) {
      throw new Error("No entries returned from App Store RSS feed");
    }

    return { source: SourceType.APP_STORE, reviews, usedFallback: false };
  } catch (err) {
    return {
      source: SourceType.APP_STORE,
      reviews: generateSyntheticReviews({ source: SourceType.APP_STORE, count: 60 }),
      usedFallback: true,
      message: `App Store RSS unavailable, used synthetic fallback: ${(err as Error).message}`,
    };
  }
}

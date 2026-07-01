import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";
import Parser from "rss-parser";

/** Real integration: Google News RSS search is public and requires no API key. */
export async function fetchGoogleNewsReviews(): Promise<IngestionResult> {
  try {
    const parser = new Parser({ timeout: 8000 });
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(env.GOOGLE_NEWS_RSS_QUERY)}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await parser.parseURL(url);

    const reviews: RawReview[] = (feed.items ?? []).map((item, idx) => ({
      source: SourceType.GOOGLE_NEWS,
      externalId: item.guid ?? item.link ?? `google-news-${idx}`,
      externalUrl: item.link,
      authorName: item.creator ?? feed.title,
      originalText: [item.title, item.contentSnippet].filter(Boolean).join(". "),
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
      rawJson: item,
    }));

    if (reviews.length === 0) throw new Error("No items returned from Google News RSS");

    return { source: SourceType.GOOGLE_NEWS, reviews, usedFallback: false };
  } catch (err) {
    return {
      source: SourceType.GOOGLE_NEWS,
      reviews: generateSyntheticReviews({ source: SourceType.GOOGLE_NEWS, count: 30 }),
      usedFallback: true,
      message: `Google News RSS unavailable, used synthetic fallback: ${(err as Error).message}`,
    };
  }
}

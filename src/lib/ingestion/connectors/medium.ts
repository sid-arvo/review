import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";
import Parser from "rss-parser";

/** Real integration: Medium exposes public per-tag and per-user RSS feeds with no auth required. */
export async function fetchMediumReviews(): Promise<IngestionResult> {
  const usernames = env.MEDIUM_RSS_USERNAMES.split(",").map((s) => s.trim()).filter(Boolean);
  const feedUrls = [
    "https://medium.com/feed/tag/spotify",
    "https://medium.com/feed/tag/music-streaming",
    ...usernames.map((u) => `https://medium.com/feed/@${u}`),
  ];

  const parser = new Parser({ timeout: 8000 });
  const reviews: RawReview[] = [];

  for (const url of feedUrls) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items ?? []) {
        reviews.push({
          source: SourceType.MEDIUM,
          externalId: item.guid ?? item.link ?? `medium-${reviews.length}`,
          externalUrl: item.link,
          authorName: item.creator,
          originalText: [item.title, item.contentSnippet].filter(Boolean).join(". ").slice(0, 2000),
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          rawJson: { title: item.title, link: item.link },
        });
      }
    } catch {
      // this particular feed is unavailable; continue with the others
    }
  }

  if (reviews.length === 0) {
    return {
      source: SourceType.MEDIUM,
      reviews: generateSyntheticReviews({ source: SourceType.MEDIUM, count: 20 }),
      usedFallback: true,
      message: "No reachable Medium RSS feeds, used synthetic fallback",
    };
  }

  return { source: SourceType.MEDIUM, reviews, usedFallback: false };
}

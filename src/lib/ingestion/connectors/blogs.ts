import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import Parser from "rss-parser";

const DEFAULT_BLOG_FEEDS = [
  "https://engineering.atspotify.com/feed/",
];

/** Real integration: generic RSS aggregation over a configurable list of public blog feeds. */
export async function fetchBlogReviews(): Promise<IngestionResult> {
  const feedUrls = (process.env.BLOG_RSS_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const urls = feedUrls.length > 0 ? feedUrls : DEFAULT_BLOG_FEEDS;

  const parser = new Parser({ timeout: 8000 });
  const reviews: RawReview[] = [];

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items ?? []) {
        reviews.push({
          source: SourceType.BLOG,
          externalId: item.guid ?? item.link ?? `blog-${reviews.length}`,
          externalUrl: item.link,
          authorName: item.creator ?? feed.title,
          originalText: [item.title, item.contentSnippet].filter(Boolean).join(". ").slice(0, 2000),
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          rawJson: { title: item.title, link: item.link },
        });
      }
    } catch {
      // feed unreachable; continue with remaining sources
    }
  }

  if (reviews.length === 0) {
    return {
      source: SourceType.BLOG,
      reviews: generateSyntheticReviews({ source: SourceType.BLOG, count: 20 }),
      usedFallback: true,
      message: "No reachable public blog feeds, used synthetic fallback",
    };
  }

  return { source: SourceType.BLOG, reviews, usedFallback: false };
}

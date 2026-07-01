import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { fetchWithTimeout } from "@/lib/ingestion/http";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";

/**
 * The Spotify Community forum (community.spotify.com, a Khoros/Lithium
 * instance) does not publish a documented public API. We attempt the
 * platform's conventional RSS export path as a best-effort scraping
 * fallback; if it is unavailable (blocked, moved, or shaped differently)
 * we fall back to synthetic data rather than a brittle HTML scrape.
 */
export async function fetchSpotifyCommunityReviews(): Promise<IngestionResult> {
  const candidateFeeds = [
    "https://community.spotify.com/t5/custom/page/page-id/rss-feeds",
    "https://community.spotify.com/t5/forums/searchpage/tab/message?q=discover%20weekly&format=atom",
  ];

  for (const url of candidateFeeds) {
    try {
      const res = await fetchWithTimeout(url, {}, 6000);
      if (!res.ok) continue;
      const xml = await res.text();
      const reviews = parseAtomFeed(xml);
      if (reviews.length > 0) {
        return { source: SourceType.SPOTIFY_COMMUNITY, reviews, usedFallback: false };
      }
    } catch {
      // try next candidate
    }
  }

  return {
    source: SourceType.SPOTIFY_COMMUNITY,
    reviews: generateSyntheticReviews({ source: SourceType.SPOTIFY_COMMUNITY, count: 70 }),
    usedFallback: true,
    message: "No public Spotify Community feed reachable, used synthetic fallback",
  };
}

function parseAtomFeed(xml: string): RawReview[] {
  const reviews: RawReview[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml))) {
    const block = match[1];
    const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(block)?.[1]?.trim();
    const id = /<id>([\s\S]*?)<\/id>/.exec(block)?.[1]?.trim();
    const link = /<link[^>]*href="([^"]*)"/.exec(block)?.[1];
    const updated = /<updated>([\s\S]*?)<\/updated>/.exec(block)?.[1];
    const summary = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(block)?.[1]?.trim();
    if (!title || !id) continue;
    reviews.push({
      source: SourceType.SPOTIFY_COMMUNITY,
      externalId: id,
      externalUrl: link,
      originalText: [title, summary].filter(Boolean).join(". "),
      publishedAt: updated ? new Date(updated) : new Date(),
    });
  }
  return reviews;
}

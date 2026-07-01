import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { fetchJson } from "@/lib/ingestion/http";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";

interface TwitterSearchResponse {
  data?: Array<{
    id: string;
    text: string;
    author_id: string;
    created_at: string;
  }>;
}

const QUERY = '(spotify "discover weekly" OR "release radar" OR "ai dj" OR recommendations) lang:en -is:retweet';

/** Real integration via the X (Twitter) API v2 recent search endpoint, gated on TWITTER_BEARER_TOKEN. */
export async function fetchTwitterReviews(): Promise<IngestionResult> {
  if (!env.TWITTER_BEARER_TOKEN) {
    return {
      source: SourceType.TWITTER,
      reviews: generateSyntheticReviews({ source: SourceType.TWITTER, count: 100 }),
      usedFallback: true,
      message: "TWITTER_BEARER_TOKEN not configured, used synthetic fallback",
    };
  }

  try {
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(QUERY)}&max_results=100&tweet.fields=created_at,author_id`;
    const data = await fetchJson<TwitterSearchResponse>(url, {
      headers: { Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}` },
    });

    const reviews: RawReview[] = (data.data ?? []).map((tweet) => ({
      source: SourceType.TWITTER,
      externalId: tweet.id,
      externalUrl: `https://x.com/i/web/status/${tweet.id}`,
      authorHandle: tweet.author_id,
      originalText: tweet.text,
      publishedAt: new Date(tweet.created_at),
      rawJson: tweet,
    }));

    if (reviews.length === 0) throw new Error("No tweets returned");

    return { source: SourceType.TWITTER, reviews, usedFallback: false };
  } catch (err) {
    return {
      source: SourceType.TWITTER,
      reviews: generateSyntheticReviews({ source: SourceType.TWITTER, count: 100 }),
      usedFallback: true,
      message: `Twitter API error, used synthetic fallback: ${(err as Error).message}`,
    };
  }
}

import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { fetchJson } from "@/lib/ingestion/http";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";

interface RedditListing {
  data: {
    children: Array<{
      data: {
        id: string;
        title: string;
        selftext: string;
        author: string;
        created_utc: number;
        permalink: string;
        score: number;
      };
    }>;
  };
}

const SUBREDDITS = ["spotify", "spotifyplaylists"];
const QUERIES = ["discover weekly", "release radar", "recommendations", "ai dj", "daylist"];

/**
 * Real integration: Reddit's public JSON search endpoints are readable
 * without OAuth for moderate volumes as long as a descriptive User-Agent is
 * sent. Falls back to synthetic data if Reddit rate-limits or blocks the
 * sandbox's egress IP.
 */
export async function fetchRedditReviews(): Promise<IngestionResult> {
  const reviews: RawReview[] = [];

  try {
    for (const subreddit of SUBREDDITS) {
      for (const query of QUERIES) {
        const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=10`;
        const data = await fetchJson<RedditListing>(
          url,
          { headers: { "User-Agent": env.REDDIT_USER_AGENT } },
          8000
        );
        for (const child of data.data.children) {
          const post = child.data;
          const text = [post.title, post.selftext].filter(Boolean).join(". ");
          if (!text || text.length < 20) continue;
          reviews.push({
            source: SourceType.REDDIT,
            externalId: post.id,
            externalUrl: `https://reddit.com${post.permalink}`,
            authorName: post.author,
            originalText: text,
            publishedAt: new Date(post.created_utc * 1000),
            rawJson: post,
          });
        }
      }
    }

    if (reviews.length === 0) {
      throw new Error("No posts returned from Reddit search");
    }

    return { source: SourceType.REDDIT, reviews, usedFallback: false };
  } catch (err) {
    return {
      source: SourceType.REDDIT,
      reviews: generateSyntheticReviews({ source: SourceType.REDDIT, count: 80 }),
      usedFallback: true,
      message: `Reddit API unavailable, used synthetic fallback: ${(err as Error).message}`,
    };
  }
}

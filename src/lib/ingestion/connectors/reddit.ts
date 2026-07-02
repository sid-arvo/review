import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { fetchJson, fetchWithTimeout } from "@/lib/ingestion/http";
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

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Reddit's app-only OAuth token via the client_credentials grant - free to
 * obtain from a "script" app registered at reddit.com/prefs/apps, and reads
 * public subreddits without needing a user to authorize anything. This is
 * what actually gets past the 403s the unauthenticated .json endpoints now
 * return for most datacenter IPs.
 */
async function getRedditAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const basicAuth = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetchWithTimeout(
    "https://www.reddit.com/api/v1/access_token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": env.REDDIT_USER_AGENT,
      },
      body: "grant_type=client_credentials",
    },
    8000
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} requesting Reddit OAuth token`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

async function searchSubreddit(subreddit: string, query: string, authHeader?: string): Promise<RawReview[]> {
  const base = authHeader ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const url = `${base}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&limit=10`;
  const data = await fetchJson<RedditListing>(
    url,
    { headers: { "User-Agent": env.REDDIT_USER_AGENT, ...(authHeader ? { Authorization: authHeader } : {}) } },
    8000
  );
  return data.data.children.flatMap((child) => {
    const post = child.data;
    const text = [post.title, post.selftext].filter(Boolean).join(". ");
    if (!text || text.length < 20) return [];
    return [
      {
        source: SourceType.REDDIT,
        externalId: post.id,
        externalUrl: `https://reddit.com${post.permalink}`,
        authorName: post.author,
        originalText: text,
        publishedAt: new Date(post.created_utc * 1000),
        rawJson: post,
      },
    ];
  });
}

/**
 * Real integration: uses Reddit's OAuth app-only token when
 * REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET are configured (this is what
 * reliably works - Reddit now 403s most unauthenticated datacenter
 * traffic). Without those, falls back to the old unauthenticated .json
 * endpoint on a best-effort basis, and to synthetic data if both fail.
 */
export async function fetchRedditReviews(): Promise<IngestionResult> {
  let authHeader: string | undefined;
  if (env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET) {
    try {
      authHeader = `Bearer ${await getRedditAccessToken()}`;
    } catch (err) {
      console.error("[reddit] OAuth token request failed, trying unauthenticated:", (err as Error).message);
    }
  }

  const reviews: RawReview[] = [];
  let lastError: Error | undefined;

  for (const subreddit of SUBREDDITS) {
    for (const query of QUERIES) {
      try {
        reviews.push(...(await searchSubreddit(subreddit, query, authHeader)));
      } catch (err) {
        lastError = err as Error;
      }
    }
  }

  if (reviews.length === 0) {
    return {
      source: SourceType.REDDIT,
      reviews: generateSyntheticReviews({ source: SourceType.REDDIT, count: 80 }),
      usedFallback: true,
      message: `Reddit API unavailable, used synthetic fallback: ${lastError?.message ?? "no results returned"}`,
    };
  }

  return { source: SourceType.REDDIT, reviews, usedFallback: false };
}

import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { fetchJson } from "@/lib/ingestion/http";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";

interface YouTubeCommentThreadsResponse {
  items?: Array<{
    id: string;
    snippet: {
      topLevelComment: {
        snippet: {
          textOriginal: string;
          authorDisplayName: string;
          publishedAt: string;
          likeCount: number;
        };
      };
    };
  }>;
}

/** Real integration via YouTube Data API v3 commentThreads.list, gated on YOUTUBE_API_KEY + video IDs. */
export async function fetchYoutubeReviews(): Promise<IngestionResult> {
  const videoIds = env.YOUTUBE_VIDEO_IDS.split(",").map((s) => s.trim()).filter(Boolean);

  if (!env.YOUTUBE_API_KEY || videoIds.length === 0) {
    return {
      source: SourceType.YOUTUBE,
      reviews: generateSyntheticReviews({ source: SourceType.YOUTUBE, count: 70 }),
      usedFallback: true,
      message: "YOUTUBE_API_KEY or YOUTUBE_VIDEO_IDS not configured, used synthetic fallback",
    };
  }

  try {
    const reviews: RawReview[] = [];
    for (const videoId of videoIds) {
      const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&key=${env.YOUTUBE_API_KEY}`;
      const data = await fetchJson<YouTubeCommentThreadsResponse>(url);
      for (const item of data.items ?? []) {
        const snippet = item.snippet.topLevelComment.snippet;
        reviews.push({
          source: SourceType.YOUTUBE,
          externalId: item.id,
          externalUrl: `https://www.youtube.com/watch?v=${videoId}&lc=${item.id}`,
          authorName: snippet.authorDisplayName,
          originalText: snippet.textOriginal,
          publishedAt: new Date(snippet.publishedAt),
          rawJson: snippet,
        });
      }
    }

    if (reviews.length === 0) throw new Error("No comments returned");

    return { source: SourceType.YOUTUBE, reviews, usedFallback: false };
  } catch (err) {
    return {
      source: SourceType.YOUTUBE,
      reviews: generateSyntheticReviews({ source: SourceType.YOUTUBE, count: 70 }),
      usedFallback: true,
      message: `YouTube API error, used synthetic fallback: ${(err as Error).message}`,
    };
  }
}

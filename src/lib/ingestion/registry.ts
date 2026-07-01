import { SourceType } from "@prisma/client";
import type { IngestionResult } from "@/lib/ingestion/types";
import { fetchGooglePlayReviews } from "@/lib/ingestion/connectors/google-play";
import { fetchAppStoreReviews } from "@/lib/ingestion/connectors/app-store";
import { fetchRedditReviews } from "@/lib/ingestion/connectors/reddit";
import { fetchSpotifyCommunityReviews } from "@/lib/ingestion/connectors/spotify-community";
import { fetchTwitterReviews } from "@/lib/ingestion/connectors/twitter";
import { fetchYoutubeReviews } from "@/lib/ingestion/connectors/youtube";
import { fetchGoogleNewsReviews } from "@/lib/ingestion/connectors/google-news";
import { fetchNewsApiReviews } from "@/lib/ingestion/connectors/newsapi";
import { fetchMediumReviews } from "@/lib/ingestion/connectors/medium";
import { fetchBlogReviews } from "@/lib/ingestion/connectors/blogs";

export const CONNECTORS: Record<SourceType, () => Promise<IngestionResult>> = {
  [SourceType.GOOGLE_PLAY]: fetchGooglePlayReviews,
  [SourceType.APP_STORE]: fetchAppStoreReviews,
  [SourceType.REDDIT]: fetchRedditReviews,
  [SourceType.SPOTIFY_COMMUNITY]: fetchSpotifyCommunityReviews,
  [SourceType.TWITTER]: fetchTwitterReviews,
  [SourceType.YOUTUBE]: fetchYoutubeReviews,
  [SourceType.GOOGLE_NEWS]: fetchGoogleNewsReviews,
  [SourceType.NEWSAPI]: fetchNewsApiReviews,
  [SourceType.MEDIUM]: fetchMediumReviews,
  [SourceType.BLOG]: fetchBlogReviews,
};

export async function runAllConnectors(): Promise<IngestionResult[]> {
  const results = await Promise.allSettled(Object.values(CONNECTORS).map((fn) => fn()));
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const source = Object.keys(CONNECTORS)[i] as SourceType;
    return { source, reviews: [], usedFallback: true, message: (r.reason as Error).message };
  });
}

import { SourceType } from "@prisma/client";
import type { IngestionResult } from "@/lib/ingestion/types";
import { fetchAppStoreReviews } from "@/lib/ingestion/connectors/app-store";
import { fetchRedditReviews } from "@/lib/ingestion/connectors/reddit";
import { fetchYoutubeReviews } from "@/lib/ingestion/connectors/youtube";
import { fetchGoogleNewsReviews } from "@/lib/ingestion/connectors/google-news";
import { fetchNewsApiReviews } from "@/lib/ingestion/connectors/newsapi";
import { fetchMediumReviews } from "@/lib/ingestion/connectors/medium";
import { fetchBlogReviews } from "@/lib/ingestion/connectors/blogs";

// Google Play, Twitter/X, and Spotify Community are intentionally absent -
// see the comment on ACTIVE_SOURCES in @/lib/domain/spotify for why none of
// them can ever return real data for a third-party tool like this one.
export const CONNECTORS: Partial<Record<SourceType, () => Promise<IngestionResult>>> = {
  [SourceType.APP_STORE]: fetchAppStoreReviews,
  [SourceType.REDDIT]: fetchRedditReviews,
  [SourceType.YOUTUBE]: fetchYoutubeReviews,
  [SourceType.GOOGLE_NEWS]: fetchGoogleNewsReviews,
  [SourceType.NEWSAPI]: fetchNewsApiReviews,
  [SourceType.MEDIUM]: fetchMediumReviews,
  [SourceType.BLOG]: fetchBlogReviews,
};

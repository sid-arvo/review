import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";

/**
 * Real integration path via the Google Play Developer API (androidpublisher
 * reviews.list) using a service-account JSON key with access to the Spotify
 * Play Console app. Requires GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to be set;
 * otherwise falls back to synthetic data since Google does not expose an
 * unauthenticated public reviews feed.
 */
export async function fetchGooglePlayReviews(): Promise<IngestionResult> {
  if (!env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    return {
      source: SourceType.GOOGLE_PLAY,
      reviews: generateSyntheticReviews({ source: SourceType.GOOGLE_PLAY, count: 90 }),
      usedFallback: true,
      message: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured, used synthetic fallback",
    };
  }

  try {
    const { google } = await import("googleapis");
    const credentials = JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const androidpublisher = google.androidpublisher({ version: "v3", auth });

    const res = await androidpublisher.reviews.list({
      packageName: env.GOOGLE_PLAY_PACKAGE_NAME,
      maxResults: 100,
    });

    const reviews: RawReview[] = (res.data.reviews ?? []).flatMap((review) => {
      const comment = review.comments?.[0]?.userComment;
      if (!comment?.text) return [];
      return [
        {
          source: SourceType.GOOGLE_PLAY,
          externalId: review.reviewId ?? crypto.randomUUID(),
          authorName: review.authorName ?? undefined,
          rating: comment.starRating ?? undefined,
          country: comment.reviewerLanguage?.split("-")[1]?.toUpperCase(),
          originalText: comment.text,
          publishedAt: comment.lastModified?.seconds
            ? new Date(Number(comment.lastModified.seconds) * 1000)
            : new Date(),
          rawJson: review,
        },
      ];
    });

    if (reviews.length === 0) {
      throw new Error("No reviews returned from Play Developer API");
    }

    return { source: SourceType.GOOGLE_PLAY, reviews, usedFallback: false };
  } catch (err) {
    return {
      source: SourceType.GOOGLE_PLAY,
      reviews: generateSyntheticReviews({ source: SourceType.GOOGLE_PLAY, count: 90 }),
      usedFallback: true,
      message: `Google Play API error, used synthetic fallback: ${(err as Error).message}`,
    };
  }
}

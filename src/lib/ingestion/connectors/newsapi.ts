import { SourceType } from "@prisma/client";
import type { IngestionResult, RawReview } from "@/lib/ingestion/types";
import { fetchJson } from "@/lib/ingestion/http";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { env } from "@/lib/env";

interface NewsApiResponse {
  articles?: Array<{
    url: string;
    title: string;
    description?: string;
    author?: string;
    publishedAt: string;
    source: { name: string };
  }>;
}

/** Real integration via NewsAPI.org /v2/everything, gated on NEWSAPI_API_KEY. */
export async function fetchNewsApiReviews(): Promise<IngestionResult> {
  if (!env.NEWSAPI_API_KEY) {
    return {
      source: SourceType.NEWSAPI,
      reviews: generateSyntheticReviews({ source: SourceType.NEWSAPI, count: 25 }),
      usedFallback: true,
      message: "NEWSAPI_API_KEY not configured, used synthetic fallback",
    };
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=Spotify%20AND%20(recommendations%20OR%20discovery)&language=en&sortBy=publishedAt&pageSize=50&apiKey=${env.NEWSAPI_API_KEY}`;
    const data = await fetchJson<NewsApiResponse>(url);

    const reviews: RawReview[] = (data.articles ?? []).map((article) => ({
      source: SourceType.NEWSAPI,
      externalId: article.url,
      externalUrl: article.url,
      authorName: article.author ?? article.source.name,
      originalText: [article.title, article.description].filter(Boolean).join(". "),
      publishedAt: new Date(article.publishedAt),
      rawJson: article,
    }));

    if (reviews.length === 0) throw new Error("No articles returned");

    return { source: SourceType.NEWSAPI, reviews, usedFallback: false };
  } catch (err) {
    return {
      source: SourceType.NEWSAPI,
      reviews: generateSyntheticReviews({ source: SourceType.NEWSAPI, count: 25 }),
      usedFallback: true,
      message: `NewsAPI error, used synthetic fallback: ${(err as Error).message}`,
    };
  }
}

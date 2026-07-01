import { Prisma, SentimentLabel, SourceType, RecommendationSurface } from "@prisma/client";

export interface DashboardFilters {
  source?: SourceType;
  country?: string;
  language?: string;
  sentiment?: SentimentLabel;
  surface?: RecommendationSurface;
  persona?: string; // persona slug
  topic?: string; // topic slug
  days?: number; // lookback window, default 90
  q?: string; // free text search (Review Explorer)
}

export type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseFilters(searchParams: SearchParams): DashboardFilters {
  const days = firstValue(searchParams.days);
  return {
    source: firstValue(searchParams.source) as SourceType | undefined,
    country: firstValue(searchParams.country),
    language: firstValue(searchParams.language),
    sentiment: firstValue(searchParams.sentiment) as SentimentLabel | undefined,
    surface: firstValue(searchParams.surface) as RecommendationSurface | undefined,
    persona: firstValue(searchParams.persona),
    topic: firstValue(searchParams.topic),
    days: days ? Number(days) : 90,
    q: firstValue(searchParams.q),
  };
}

export function filtersToWhere(filters: DashboardFilters): Prisma.ReviewWhereInput {
  const where: Prisma.ReviewWhereInput = {
    isDuplicate: false,
    processingStatus: "PROCESSED",
  };

  if (filters.source) where.source = filters.source;
  if (filters.country) where.country = filters.country;
  if (filters.language) where.language = filters.language;
  if (filters.sentiment) where.sentimentLabel = filters.sentiment;
  if (filters.persona) where.persona = { slug: filters.persona };
  if (filters.surface) {
    where.recommendationSurfaces = { some: { surface: filters.surface } };
  }
  if (filters.topic) {
    where.topics = { some: { topic: { slug: filters.topic } } };
  }
  if (filters.days) {
    where.publishedAt = { gte: new Date(Date.now() - filters.days * 24 * 3600 * 1000) };
  }
  if (filters.q) {
    where.OR = [
      { cleanText: { contains: filters.q, mode: "insensitive" } },
      { originalText: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export const LOOKBACK_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
  { label: "Last 12 months", value: 365 },
  { label: "All time", value: 3650 },
];

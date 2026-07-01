import { SentimentLabel, RecommendationSurface } from "@prisma/client";

export interface EnrichmentResult {
  cleanText: string;
  language: string;
  translatedText?: string;
  sentimentLabel: SentimentLabel;
  sentimentScore: number; // -1..1
  emotions: Record<string, number>; // joy, frustration, excitement, disappointment, confusion, gratitude
  intentSummary: string;
  qualityScore: number; // 0..1, how substantive/useful the feedback is
  isFeatureRequest: boolean;
  isPainPoint: boolean;
  isBugReport: boolean;
  isPraise: boolean;
  jtbd: { job: string; context: string; outcome: string } | null;
  personaSlug: string | null;
  topicSlugs: string[];
  surfaces: RecommendationSurface[];
  featureRequestTitle: string | null;
  painPointTitle: string | null;
}

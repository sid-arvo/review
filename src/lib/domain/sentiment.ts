import { SentimentLabel } from "@prisma/client";

export const SENTIMENT_LABELS: Record<SentimentLabel, string> = {
  VERY_NEGATIVE: "Very Negative",
  NEGATIVE: "Negative",
  NEUTRAL: "Neutral",
  POSITIVE: "Positive",
  VERY_POSITIVE: "Very Positive",
};

export const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  VERY_NEGATIVE: "oklch(0.6 0.22 25)",
  NEGATIVE: "oklch(0.68 0.18 40)",
  NEUTRAL: "oklch(0.7 0.02 90)",
  POSITIVE: "oklch(0.72 0.15 149)",
  VERY_POSITIVE: "oklch(0.6 0.19 149)",
};

export const EMOTION_COLORS: Record<string, string> = {
  joy: "oklch(0.72 0.19 149)",
  excitement: "oklch(0.75 0.18 70)",
  frustration: "oklch(0.65 0.24 27)",
  disappointment: "oklch(0.65 0.2 40)",
  confusion: "oklch(0.65 0.19 300)",
  gratitude: "oklch(0.7 0.17 255)",
};

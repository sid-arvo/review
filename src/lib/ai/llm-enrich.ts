import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getChatClient, CHAT_MODEL, REASONING_EFFORT_OPTION } from "@/lib/ai/openai-client";
import { RecommendationSurface } from "@prisma/client";
import { TOPIC_TAXONOMY, PERSONA_TAXONOMY } from "@/lib/domain/spotify";
import type { EnrichmentResult } from "@/lib/ai/types";
import { heuristicEnrich } from "@/lib/ai/heuristics";

const TOPIC_SLUGS = TOPIC_TAXONOMY.map((t) => t.slug) as [string, ...string[]];
const PERSONA_SLUGS = PERSONA_TAXONOMY.map((p) => p.slug) as [string, ...string[]];
const SURFACE_VALUES = Object.values(RecommendationSurface) as [RecommendationSurface, ...RecommendationSurface[]];

// A fixed-shape object (rather than z.record) since some OpenAI-compatible
// providers' strict JSON-schema validators (e.g. Groq) don't support
// propertyNames/additionalProperties patterns needed for open-ended records.
const EmotionsSchema = z.object({
  joy: z.number().min(0).max(1),
  excitement: z.number().min(0).max(1),
  frustration: z.number().min(0).max(1),
  disappointment: z.number().min(0).max(1),
  confusion: z.number().min(0).max(1),
  gratitude: z.number().min(0).max(1),
});

const LlmEnrichmentSchema = z.object({
  sentimentLabel: z.enum(["VERY_NEGATIVE", "NEGATIVE", "NEUTRAL", "POSITIVE", "VERY_POSITIVE"]),
  sentimentScore: z.number().min(-1).max(1),
  emotions: EmotionsSchema,
  intentSummary: z.string(),
  qualityScore: z.number().min(0).max(1),
  isFeatureRequest: z.boolean(),
  isPainPoint: z.boolean(),
  isBugReport: z.boolean(),
  isPraise: z.boolean(),
  jtbdJob: z.string().nullable(),
  jtbdContext: z.string().nullable(),
  jtbdOutcome: z.string().nullable(),
  personaSlug: z.enum(PERSONA_SLUGS).nullable(),
  topicSlugs: z.array(z.enum(TOPIC_SLUGS)).min(1).max(3),
  surfaces: z.array(z.enum(SURFACE_VALUES)).max(4),
  featureRequestTitle: z.string().nullable(),
  painPointTitle: z.string().nullable(),
});

const SYSTEM_PROMPT = `You are an analyst for Spotify's Voice-of-Customer Intelligence platform, specialized in the music discovery & recommendation experience (Discover Weekly, Release Radar, AI DJ, Daylist, Blend, Smart Shuffle, Made For You, Radio, Search, Playlist Recommendations, Artist Radio, Album Recommendations, Premium, Ads, Podcasts, Offline Downloads, Liked Songs, Queue, Library, Jam, Wrapped, Friend Activity, Collaborative Playlists).
Given a single piece of public user feedback, extract structured signal for product analytics. Be precise and conservative - only tag a recommendation surface if it is clearly referenced or strongly implied. topicSlugs must be chosen only from the provided taxonomy.`;

/** Single combined structured-output call per review - cheaper and faster than one call per field. */
export async function llmEnrich(cleanedText: string, ratingHint?: number): Promise<Omit<EnrichmentResult, "cleanText" | "language" | "translatedText">> {
  try {
    const chatClient = getChatClient();
    const completion = await chatClient.chat.completions.parse({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Feedback text: """${cleanedText}"""\n${ratingHint ? `Star rating given: ${ratingHint}/5` : ""}\n\nValid topic slugs: ${TOPIC_SLUGS.join(", ")}\nValid persona slugs: ${PERSONA_SLUGS.join(", ")}`,
        },
      ],
      response_format: zodResponseFormat(LlmEnrichmentSchema, "enrichment"),
      temperature: 0.2,
      ...REASONING_EFFORT_OPTION,
    });

    const parsed = completion.choices[0].message.parsed;
    if (!parsed) throw new Error("Model returned no parsed content");

    const emotions = Object.fromEntries(Object.entries(parsed.emotions).filter(([, v]) => v > 0.05));

    return {
      sentimentLabel: parsed.sentimentLabel,
      sentimentScore: parsed.sentimentScore,
      emotions,
      intentSummary: parsed.intentSummary,
      qualityScore: parsed.qualityScore,
      isFeatureRequest: parsed.isFeatureRequest,
      isPainPoint: parsed.isPainPoint,
      isBugReport: parsed.isBugReport,
      isPraise: parsed.isPraise,
      jtbd: parsed.jtbdJob ? { job: parsed.jtbdJob, context: parsed.jtbdContext ?? "", outcome: parsed.jtbdOutcome ?? "" } : null,
      personaSlug: parsed.personaSlug,
      topicSlugs: parsed.topicSlugs,
      surfaces: parsed.surfaces,
      featureRequestTitle: parsed.featureRequestTitle,
      painPointTitle: parsed.painPointTitle,
    };
  } catch (err) {
    console.error("[llmEnrich] falling back to heuristics:", (err as Error).message);
    return heuristicEnrich(cleanedText, cleanedText, ratingHint);
  }
}

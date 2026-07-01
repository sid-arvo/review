import { RecommendationSurface, SentimentLabel } from "@prisma/client";
import { SURFACE_LABELS, TOPIC_TAXONOMY, PERSONA_TAXONOMY } from "@/lib/domain/spotify";
import type { EnrichmentResult } from "@/lib/ai/types";

const POSITIVE_WORDS = [
  "love", "great", "amazing", "perfect", "impressed", "favorite", "awesome", "fantastic",
  "nailed", "smooth", "enjoy", "excited", "obsessed", "worth", "well matched", "surprising",
  "genuinely impressed", "underrated", "easier", "well done",
];
const NEGATIVE_WORDS = [
  "frustrat", "annoying", "disappoint", "hate", "stale", "repetitive", "broken", "bug",
  "crash", "worse", "stuck", "trap", "ignore", "off", "wish", "confusing", "jarring",
  "expensive", "invasive", "duplicat", "lost", "slow", "took forever", "same songs",
];

const EMOTION_LEXICON: Record<string, string[]> = {
  joy: ["love", "favorite", "enjoy", "obsessed", "great", "fun"],
  excitement: ["excited", "impressed", "surprising", "can't wait", "amazing"],
  frustration: ["frustrat", "annoying", "stuck", "trap", "ignore", "jarring"],
  disappointment: ["disappoint", "stale", "repetitive", "worse", "hate", "expensive"],
  confusion: ["confus", "wish i could", "not sure", "unclear"],
  gratitude: ["thank", "appreciate", "worth the subscription", "glad"],
};

const FEATURE_REQUEST_MARKERS = ["wish", "please add", "would love", "feature request", "add a", "please let", "would be great if", "toggle for", "slider for"];
const BUG_MARKERS = ["crash", "bug", "freeze", "won't play", "wouldn't play", "stutter", "error", "glitch"];
const PAIN_POINT_MARKERS = ["frustrat", "annoying", "issue", "problem", "broken", "doesn't work", "stale", "repetitive", "confus", "invasive", "lost"];

function normalize(text: string) {
  return text.toLowerCase();
}

export function scoreSentiment(text: string): { label: SentimentLabel; score: number } {
  const lower = normalize(text);
  let score = 0;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) score -= 1;

  const normalized = Math.max(-1, Math.min(1, score / 4));
  let label: SentimentLabel;
  if (normalized <= -0.6) label = SentimentLabel.VERY_NEGATIVE;
  else if (normalized < -0.15) label = SentimentLabel.NEGATIVE;
  else if (normalized < 0.15) label = SentimentLabel.NEUTRAL;
  else if (normalized < 0.6) label = SentimentLabel.POSITIVE;
  else label = SentimentLabel.VERY_POSITIVE;

  return { label, score: normalized };
}

export function detectEmotions(text: string): Record<string, number> {
  const lower = normalize(text);
  const emotions: Record<string, number> = {};
  for (const [emotion, words] of Object.entries(EMOTION_LEXICON)) {
    const hits = words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
    if (hits > 0) emotions[emotion] = Math.min(1, hits / 2);
  }
  return emotions;
}

export function detectSurfaces(text: string): RecommendationSurface[] {
  const lower = normalize(text);
  const found: RecommendationSurface[] = [];
  for (const [surface, label] of Object.entries(SURFACE_LABELS) as [RecommendationSurface, string][]) {
    if (lower.includes(label.toLowerCase())) found.push(surface);
  }
  return found;
}

export function detectTopics(text: string): string[] {
  const lower = normalize(text);
  const matches: string[] = [];
  const KEYWORDS: Record<string, string[]> = {
    "music-discovery": ["discover", "new music", "new artist", "hidden gem", "explore"],
    "recommendation-repetition": ["repetitive", "same songs", "stale", "recycl", "same 20", "same 10"],
    "personalization-accuracy": ["personaliz", "algorithm", "doesn't understand", "taste", "recommended", "already disliked"],
    "search-experience": ["search"],
    "playlist-curation": ["playlist"],
    podcasts: ["podcast"],
    "premium-pricing": ["premium", "pricing", "subscription", "price"],
    "ads-experience": ["ad ", "ads", "advert"],
    "playback-offline": ["offline", "download", "playback", "stutter", "queue"],
    "social-features": ["blend", "jam", "friend activity", "collaborative", "social"],
    "wrapped-stats": ["wrapped"],
    "app-performance": ["crash", "slow", "battery", "load"],
    "ui-ux": ["navigation", "redesign", "layout", "home screen", "onboarding"],
  };
  for (const [slug, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) matches.push(slug);
  }
  if (matches.length === 0) matches.push("music-discovery");
  return Array.from(new Set(matches)).filter((slug) => TOPIC_TAXONOMY.some((t) => t.slug === slug));
}

export function detectPersona(text: string, ratingHint?: number): string {
  const lower = normalize(text);
  const KEYWORDS: Record<string, string[]> = {
    "music-discoverer": ["discover", "new artist", "hidden gem", "explore", "niche"],
    "power-user": ["every day", "algorithm", "daily", "heavy user"],
    "podcast-enthusiast": ["podcast"],
    "free-tier-user": ["ad ", "ads", "free tier", "advert"],
    audiophile: ["audio quality", "bitrate", "lossless", "library"],
    "playlist-curator": ["playlist", "curate", "collaborative"],
    "new-user": ["new user", "just switched", "first-timer", "onboarding"],
    "social-listener": ["blend", "jam", "friend activity"],
    "nostalgic-listener": ["throwback", "wrapped", "used to"],
    "casual-listener": ["casual", "occasionally"],
  };
  for (const [slug, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return slug;
  }
  if (ratingHint !== undefined && ratingHint <= 2) return "power-user";
  return PERSONA_TAXONOMY[Math.abs(hashCode(text)) % PERSONA_TAXONOMY.length].slug;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function buildJtbd(topicSlugs: string[], surfaces: RecommendationSurface[], polarity: "negative" | "positive" | "neutral") {
  const topic = topicSlugs[0] ?? "music-discovery";
  const surface = surfaces[0] ? SURFACE_LABELS[surfaces[0]] : "Spotify's recommendations";
  const topicMeta = TOPIC_TAXONOMY.find((t) => t.slug === topic);
  const job = `Find music that matches my taste without manual effort`;
  const context = `Using ${surface} in the context of ${topicMeta?.name.toLowerCase() ?? "music discovery"}`;
  const outcome =
    polarity === "negative"
      ? `Outcome not achieved - feedback indicates unmet expectations`
      : polarity === "positive"
        ? `Outcome achieved - feature is successfully satisfying this job`
        : `Partial outcome - feature works but has friction`;
  return { job, context, outcome };
}

export function isFeatureRequest(text: string): boolean {
  const lower = normalize(text);
  return FEATURE_REQUEST_MARKERS.some((m) => lower.includes(m));
}

export function isBugReport(text: string): boolean {
  const lower = normalize(text);
  return BUG_MARKERS.some((m) => lower.includes(m));
}

export function isPainPoint(text: string, sentimentScore: number): boolean {
  const lower = normalize(text);
  return sentimentScore < -0.1 && PAIN_POINT_MARKERS.some((m) => lower.includes(m));
}

export function isPraise(sentimentScore: number): boolean {
  return sentimentScore > 0.4;
}

export function qualityScore(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const lengthScore = Math.min(1, words / 40);
  const specificityScore = /\b(discover weekly|release radar|ai dj|daylist|blend|smart shuffle)\b/i.test(text) ? 0.3 : 0;
  return Math.min(1, lengthScore * 0.7 + specificityScore);
}

export function summarizeIntent(text: string, topicSlugs: string[], polarity: "negative" | "positive" | "neutral"): string {
  const topicMeta = TOPIC_TAXONOMY.find((t) => t.slug === topicSlugs[0]);
  const verb = polarity === "negative" ? "raises a concern about" : polarity === "positive" ? "praises" : "comments on";
  return `User ${verb} ${topicMeta?.name.toLowerCase() ?? "the discovery experience"}.`;
}

export function heuristicEnrich(rawText: string, cleanedText: string, ratingHint?: number): Omit<EnrichmentResult, "cleanText" | "language" | "translatedText"> {
  const { label, score } = scoreSentiment(cleanedText);
  const polarity = score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral";
  const topicSlugs = detectTopics(cleanedText);
  const surfaces = detectSurfaces(cleanedText);
  const personaSlug = detectPersona(cleanedText, ratingHint);
  const featureRequest = isFeatureRequest(cleanedText);
  const bug = isBugReport(cleanedText);
  const painPoint = isPainPoint(cleanedText, score);
  const praise = isPraise(score);

  return {
    sentimentLabel: label,
    sentimentScore: score,
    emotions: detectEmotions(cleanedText),
    intentSummary: summarizeIntent(cleanedText, topicSlugs, polarity),
    qualityScore: qualityScore(cleanedText),
    isFeatureRequest: featureRequest,
    isPainPoint: painPoint,
    isBugReport: bug,
    isPraise: praise,
    jtbd: buildJtbd(topicSlugs, surfaces, polarity),
    personaSlug,
    topicSlugs,
    surfaces,
    featureRequestTitle: featureRequest ? deriveFeatureRequestTitle(cleanedText, surfaces) : null,
    painPointTitle: painPoint ? derivePainPointTitle(cleanedText, topicSlugs) : null,
  };
}

function deriveFeatureRequestTitle(text: string, surfaces: RecommendationSurface[]): string {
  const surfaceLabel = surfaces[0] ? SURFACE_LABELS[surfaces[0]] : "Discovery";
  if (/exclude|permanently exclude|genre/i.test(text)) return `Allow excluding genres from ${surfaceLabel}`;
  if (/toggle|slider|adventurous/i.test(text)) return `Add adventurousness control for ${surfaceLabel}`;
  if (/undo|thumbs.?down/i.test(text)) return `Add undo for thumbs-down on ${surfaceLabel}`;
  if (/filter/i.test(text)) return `Add filtering options to ${surfaceLabel}`;
  return `Improve customization for ${surfaceLabel}`;
}

function derivePainPointTitle(text: string, topicSlugs: string[]): string {
  const topicMeta = TOPIC_TAXONOMY.find((t) => t.slug === topicSlugs[0]);
  if (/crash|freeze|bug|glitch/i.test(text)) return `App stability issues`;
  if (/repetitive|stale|same songs|same 20|same 10/i.test(text)) return `Recommendations feel repetitive`;
  if (/duplicat/i.test(text)) return `Duplicate tracks in collaborative playlists`;
  if (/slow|load/i.test(text)) return `Performance & load time complaints`;
  return `${topicMeta?.name ?? "Discovery"} friction`;
}

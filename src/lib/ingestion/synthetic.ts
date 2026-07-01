import { SourceType } from "@prisma/client";
import type { RawReview } from "@/lib/ingestion/types";
import { SCENARIOS, renderScenario, type Scenario } from "@/lib/ingestion/scenarios";
import { mulberry32, pick, randInt } from "@/lib/ingestion/rng";

const COUNTRY_WEIGHTS = [
  { value: "US", weight: 30 }, { value: "GB", weight: 10 }, { value: "BR", weight: 8 },
  { value: "DE", weight: 7 }, { value: "IN", weight: 7 }, { value: "MX", weight: 6 },
  { value: "CA", weight: 5 }, { value: "AU", weight: 5 }, { value: "FR", weight: 4 },
  { value: "SE", weight: 3 }, { value: "JP", weight: 3 }, { value: "NL", weight: 3 },
  { value: "ES", weight: 3 }, { value: "IT", weight: 3 }, { value: "KR", weight: 2 },
  { value: "ID", weight: 2 }, { value: "PH", weight: 2 }, { value: "NG", weight: 2 },
  { value: "ZA", weight: 2 }, { value: "PL", weight: 2 },
];

const FIRST_NAMES = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Drew", "Priya", "Wei", "Diego", "Fatima", "Liam", "Noah", "Emma", "Olivia", "Lucas", "Mia"];
const LAST_INITIALS = ["A.", "B.", "C.", "D.", "J.", "K.", "L.", "M.", "R.", "S.", "T."];

function pickCountryWeighted(rng: () => number): string {
  const total = COUNTRY_WEIGHTS.reduce((s, c) => s + c.weight, 0);
  let r = rng() * total;
  for (const c of COUNTRY_WEIGHTS) {
    r -= c.weight;
    if (r <= 0) return c.value;
  }
  return "US";
}

function trendMultiplier(scenario: Scenario, daysAgo: number, maxDays: number): number {
  const t = Math.min(1, daysAgo / maxDays);
  switch (scenario.trend) {
    case "rising":
      return 1 + (1 - t) * 1.8;
    case "falling":
      return 1 + t * 1.8;
    case "spiky":
      return 1 + Math.max(0, Math.sin(daysAgo / 12)) * 1.6;
    default:
      return 1;
  }
}

function pickScenario(rng: () => number, daysAgo: number, maxDays: number, allow?: Scenario[]): Scenario {
  const pool = allow ?? SCENARIOS;
  const weighted = pool.map((s) => ({ value: s, weight: s.weight * trendMultiplier(s, daysAgo, maxDays) }));
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let r = rng() * total;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.value;
  }
  return pool[0];
}

function ratingForPolarity(rng: () => number, polarity: Scenario["polarity"]): number {
  if (polarity === "negative") return pick(rng, [1, 1, 2, 2, 3]);
  if (polarity === "positive") return pick(rng, [4, 5, 5, 5]);
  return pick(rng, [3, 3, 4]);
}

function authorName(rng: () => number): string {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_INITIALS)}`;
}

const PREFIXES = ["", "", "", "Honestly, ", "Ngl, ", "Okay so ", "Real talk: ", "Update: ", "So... ", "Quick thought - "];
const SUFFIXES = ["", "", "", " Anyway.", " Just my two cents.", " Curious what others think.", " Not a huge deal but worth flagging.", " Hope this gets fixed soon.", " Loving Spotify overall though.", " Been like this for a couple weeks now."];

/** Wraps a rendered template with optional filler phrases so repeated scenario+surface draws still yield distinct text. */
function addVariation(text: string, rng: () => number): string {
  const prefix = pick(rng, PREFIXES);
  const suffix = pick(rng, SUFFIXES);
  const withPrefix = prefix ? prefix + text.charAt(0).toLowerCase() + text.slice(1) : text;
  return suffix ? `${withPrefix}${suffix}` : withPrefix;
}

function formatForSource(source: SourceType, text: string, rng: () => number): string {
  switch (source) {
    case SourceType.TWITTER: {
      const tags = pick(rng, ["#Spotify #DiscoverWeekly", "#Spotify", "#SpotifyWrapped", "#music", ""]);
      return `${text}${tags ? " " + tags : ""}`;
    }
    case SourceType.REDDIT:
    case SourceType.SPOTIFY_COMMUNITY:
      return `${text} ${pick(rng, [
        "Anyone else experiencing this?",
        "Curious if this is a regional thing or everyone's seeing it.",
        "Posting here since support hasn't been helpful.",
        "",
      ])}`.trim();
    case SourceType.YOUTUBE:
      return `${text} ${pick(rng, ["😩", "🎧", "👀", ""])}`.trim();
    default:
      return text;
  }
}

export interface GenerateOptions {
  source: SourceType;
  count: number;
  maxDaysAgo?: number;
  seed?: number;
  scenarioFilter?: (scenario: Scenario) => boolean;
}

export function generateSyntheticReviews(opts: GenerateOptions): RawReview[] {
  const { source, count, maxDaysAgo = 180, seed = 42 } = opts;
  const rng = mulberry32(seed + hashSource(source));
  const pool = opts.scenarioFilter ? SCENARIOS.filter(opts.scenarioFilter) : SCENARIOS;
  const now = Date.now();
  const reviews: RawReview[] = [];

  const hasRating = source === SourceType.GOOGLE_PLAY || source === SourceType.APP_STORE;

  for (let i = 0; i < count; i++) {
    const daysAgo = randInt(rng, 0, maxDaysAgo);
    const hoursAgo = randInt(rng, 0, 23);
    const scenario = pickScenario(rng, daysAgo, maxDaysAgo, pool);
    const { text } = renderScenario(scenario, rng);
    const varied = addVariation(text, rng);
    const formatted = formatForSource(source, varied, rng);
    const publishedAt = new Date(now - daysAgo * 86_400_000 - hoursAgo * 3_600_000);

    reviews.push({
      source,
      externalId: `synthetic-${source}-${seed}-${i}`,
      externalUrl: undefined,
      authorName: authorName(rng),
      authorHandle: source === SourceType.TWITTER ? `@user${randInt(rng, 1000, 9999)}` : undefined,
      rating: hasRating ? ratingForPolarity(rng, scenario.polarity) : undefined,
      country: pickCountryWeighted(rng),
      originalText: formatted,
      publishedAt,
      rawJson: { scenarioId: scenario.id, synthetic: true },
    });
  }

  return reviews;
}

function hashSource(source: string): number {
  let h = 0;
  for (let i = 0; i < source.length; i++) h = (h * 31 + source.charCodeAt(i)) | 0;
  return h;
}

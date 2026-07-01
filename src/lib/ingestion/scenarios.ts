import { RecommendationSurface } from "@prisma/client";
import { SURFACE_LABELS } from "@/lib/domain/spotify";

export type TrendShape = "rising" | "falling" | "flat" | "spiky";

export interface Scenario {
  id: string;
  topicSlug: string;
  polarity: "negative" | "positive" | "neutral";
  surfaces: RecommendationSurface[];
  personaSlugs: string[];
  trend: TrendShape;
  weight: number;
  templates: string[];
}

const GENRES = ["indie folk", "hyperpop", "afrobeats", "lo-fi jazz", "K-pop", "classic rock", "ambient", "drum and bass", "bedroom pop", "Latin trap"];
const ARTISTS = ["a small indie artist", "an up-and-coming producer", "a local band", "an artist I saw live once", "a niche composer"];

function s(surface: RecommendationSurface) {
  return SURFACE_LABELS[surface];
}

export function renderScenario(scenario: Scenario, rng: () => number): { text: string; surface: RecommendationSurface } {
  const surface = scenario.surfaces[Math.floor(rng() * scenario.surfaces.length)];
  const genre = GENRES[Math.floor(rng() * GENRES.length)];
  const artist = ARTISTS[Math.floor(rng() * ARTISTS.length)];
  const template = scenario.templates[Math.floor(rng() * scenario.templates.length)];
  const text = template
    .replace(/\{surface\}/g, s(surface))
    .replace(/\{genre\}/g, genre)
    .replace(/\{artist\}/g, artist);
  return { text, surface };
}

const DISCOVERY_SURFACES = [
  RecommendationSurface.DISCOVER_WEEKLY,
  RecommendationSurface.RELEASE_RADAR,
  RecommendationSurface.MADE_FOR_YOU,
];

export const SCENARIOS: Scenario[] = [
  {
    id: "repetition-core",
    topicSlug: "recommendation-repetition",
    polarity: "negative",
    surfaces: DISCOVERY_SURFACES,
    personaSlugs: ["power-user", "music-discoverer"],
    trend: "rising",
    weight: 14,
    templates: [
      "My {surface} has played basically the same 20 songs for the last month. It feels like Spotify gave up on finding anything new for me.",
      "{surface} used to feel fresh every week, now it's just recycling tracks I already skipped last month. So repetitive.",
      "Why does {surface} keep suggesting songs that are already in my Liked Songs? That's not a recommendation, that's just my own library reshuffled.",
      "I've noticed {surface} has gotten really stale lately - same artists, same vibe, week after week. Where's the discovery?",
      "Genuinely disappointed with {surface} this month. Zero new artists, just a loop of stuff I've heard a hundred times.",
    ],
  },
  {
    id: "personalization-miss",
    topicSlug: "personalization-accuracy",
    polarity: "negative",
    surfaces: [RecommendationSurface.AI_DJ, RecommendationSurface.MADE_FOR_YOU, RecommendationSurface.SMART_SHUFFLE],
    personaSlugs: ["power-user", "audiophile"],
    trend: "rising",
    weight: 10,
    templates: [
      "{surface} keeps recommending music I explicitly disliked. Did it even look at my listening history?",
      "The {surface} algorithm feels completely off lately - it's suggesting {genre} when I've never listened to anything like that.",
      "I gave {surface} a thumbs down on a track three times and it's still queuing it up. The personalization just isn't working.",
      "{surface} used to nail my taste, now it feels like it's recommending to a generic average listener, not me specifically.",
    ],
  },
  {
    id: "discovery-shallow",
    topicSlug: "music-discovery",
    polarity: "negative",
    surfaces: DISCOVERY_SURFACES,
    personaSlugs: ["music-discoverer", "power-user"],
    trend: "rising",
    weight: 12,
    templates: [
      "I used to find so many hidden gems through {surface}, but lately it only surfaces mainstream tracks everyone already knows.",
      "Discovering {artist} used to happen naturally through Spotify. Now {surface} just plays it safe with popular songs in my genre.",
      "Despite Spotify's 'advanced' recommendation system, I still find more new music from friends than from {surface}.",
      "{surface} rarely takes risks anymore. I want to be introduced to {genre} I've never heard, not more of the same.",
      "It's ironic that with all this AI, {surface} still can't help me discover music outside my bubble.",
    ],
  },
  {
    id: "genre-bubble",
    topicSlug: "music-discovery",
    polarity: "negative",
    surfaces: [RecommendationSurface.RADIO, RecommendationSurface.ARTIST_RADIO, RecommendationSurface.SMART_SHUFFLE],
    personaSlugs: ["music-discoverer", "casual-listener"],
    trend: "flat",
    weight: 7,
    templates: [
      "Once you listen to one {genre} track, {surface} traps you in that lane forever. I want to explore, not get stuck.",
      "{surface} pigeonholes me into the same three genres. Real music discovery should push boundaries occasionally.",
      "I wish {surface} would take a chance on something outside my usual bubble every now and then.",
    ],
  },
  {
    id: "search-experience",
    topicSlug: "search-experience",
    polarity: "negative",
    surfaces: [RecommendationSurface.SEARCH],
    personaSlugs: ["casual-listener", "power-user"],
    trend: "flat",
    weight: 8,
    templates: [
      "Search is so frustrating - I typed the exact artist name and it showed me a completely unrelated result first.",
      "Why does {surface} prioritize podcasts over the song I'm clearly looking for by name?",
      "{surface} results feel less accurate than they used to. Typos shouldn't completely derail the results.",
      "I can never find obscure {genre} tracks through {surface}, even when I type the exact title.",
    ],
  },
  {
    id: "discover-weekly-praise",
    topicSlug: "music-discovery",
    polarity: "positive",
    surfaces: [RecommendationSurface.DISCOVER_WEEKLY, RecommendationSurface.RELEASE_RADAR],
    personaSlugs: ["music-discoverer", "power-user"],
    trend: "flat",
    weight: 9,
    templates: [
      "{surface} introduced me to my new favorite artist this week, this feature alone is worth the subscription.",
      "Genuinely impressed - {surface} found {artist} that fits my taste perfectly. This is why I love Spotify.",
      "Every Monday I look forward to {surface}. It's rare but when it hits, it really hits.",
      "Found some incredible {genre} through {surface} today. Recommendations like this are why I stay subscribed.",
    ],
  },
  {
    id: "ai-dj-praise",
    topicSlug: "music-discovery",
    polarity: "positive",
    surfaces: [RecommendationSurface.AI_DJ, RecommendationSurface.DAYLIST],
    personaSlugs: ["power-user", "music-discoverer"],
    trend: "flat",
    weight: 6,
    templates: [
      "The {surface} commentary is such a fun touch, and the song choices have been surprisingly on point lately.",
      "{surface} nailed my mood perfectly today with a mix of {genre} I wouldn't have picked myself.",
      "Didn't expect to like {surface} this much but it keeps surprising me with great transitions between songs.",
    ],
  },
  {
    id: "blend-jam-praise",
    topicSlug: "social-features",
    polarity: "positive",
    surfaces: [RecommendationSurface.BLEND, RecommendationSurface.JAM],
    personaSlugs: ["social-listener", "playlist-curator"],
    trend: "flat",
    weight: 6,
    templates: [
      "Made a {surface} with my partner and it's honestly a great way to discover what we both would enjoy.",
      "{surface} is such an underrated feature, love seeing where my taste overlaps with friends.",
      "Started a {surface} session on a road trip and it made picking music so much easier for the group.",
    ],
  },
  {
    id: "feature-request-controls",
    topicSlug: "personalization-accuracy",
    polarity: "neutral",
    surfaces: [RecommendationSurface.DISCOVER_WEEKLY, RecommendationSurface.MADE_FOR_YOU, RecommendationSurface.AI_DJ],
    personaSlugs: ["power-user", "audiophile"],
    trend: "rising",
    weight: 9,
    templates: [
      "Wish I could tell {surface} to permanently exclude a genre I don't like instead of it creeping back in every few weeks.",
      "Please add a toggle for how adventurous vs safe {surface} recommendations should be. Sometimes I want familiar, sometimes new.",
      "Would love an 'undo' on thumbs-down so {surface} doesn't overcorrect after one bad rating.",
      "A simple slider for 'more discovery vs more familiar' on {surface} would fix most of my complaints.",
    ],
  },
  {
    id: "podcast-mixed",
    topicSlug: "podcasts",
    polarity: "neutral",
    surfaces: [RecommendationSurface.PODCASTS],
    personaSlugs: ["podcast-enthusiast"],
    trend: "flat",
    weight: 6,
    templates: [
      "Podcast recommendations under {surface} feel like an afterthought compared to how good the music recommendations can be.",
      "Really enjoy the podcast discovery lately, found a couple of great shows through {surface} this month.",
      "Wish {surface} let me filter recommended podcasts by episode length, some suggestions are 3 hours long.",
    ],
  },
  {
    id: "ads-frequency",
    topicSlug: "ads-experience",
    polarity: "negative",
    surfaces: [RecommendationSurface.ADS],
    personaSlugs: ["free-tier-user"],
    trend: "flat",
    weight: 7,
    templates: [
      "The same ad has played four times in one listening session. It's genuinely pushing me to just pay for Premium.",
      "Ad breaks feel more frequent than a few months ago, really breaks the flow of {surface} discovery sessions.",
      "I don't mind ads but the volume jump between the music and the ad is jarring every single time.",
    ],
  },
  {
    id: "premium-pricing",
    topicSlug: "premium-pricing",
    polarity: "negative",
    surfaces: [RecommendationSurface.PREMIUM],
    personaSlugs: ["free-tier-user", "casual-listener"],
    trend: "flat",
    weight: 5,
    templates: [
      "Premium price keeps creeping up but the actual recommendation quality hasn't improved to match.",
      "Considering canceling {surface} - paying more each year for what feels like the same discovery experience.",
      "Family plan pricing is fine, but individual Premium feels expensive for what's mostly a better ad-free experience.",
    ],
  },
  {
    id: "offline-playback-bug",
    topicSlug: "playback-offline",
    polarity: "negative",
    surfaces: [RecommendationSurface.OFFLINE_DOWNLOADS, RecommendationSurface.QUEUE],
    personaSlugs: ["power-user", "casual-listener"],
    trend: "flat",
    weight: 6,
    templates: [
      "Downloaded playlists for a flight and half the songs wouldn't play offline. Frustrating when you're relying on {surface}.",
      "{surface} randomly clears itself after an app update. Lost my whole travel playlist downloads twice now.",
      "Playback stutters constantly on {surface} even with a strong connection, been happening since the last update.",
    ],
  },
  {
    id: "app-performance-bug",
    topicSlug: "app-performance",
    polarity: "negative",
    surfaces: [RecommendationSurface.LIBRARY, RecommendationSurface.QUEUE],
    personaSlugs: ["casual-listener", "power-user"],
    trend: "flat",
    weight: 6,
    templates: [
      "App crashes almost every time I try to reorder my {surface}. Been happening since the latest update.",
      "{surface} takes forever to load lately, feels like it's gotten slower with every redesign.",
      "Battery drain has gotten noticeably worse since the newest app version, even with the screen off.",
    ],
  },
  {
    id: "ui-ux-navigation",
    topicSlug: "ui-ux",
    polarity: "negative",
    surfaces: [RecommendationSurface.LIBRARY, RecommendationSurface.SEARCH],
    personaSlugs: ["casual-listener", "new-user"],
    trend: "flat",
    weight: 5,
    templates: [
      "The new home screen layout buries {surface} three taps deep, used to be one tap away.",
      "Navigation has gotten more confusing with every redesign, I can never find {surface} where I expect it.",
      "Took me a while as a new user to even find where {surface} lives in the app.",
    ],
  },
  {
    id: "ui-ux-praise",
    topicSlug: "ui-ux",
    polarity: "positive",
    surfaces: [RecommendationSurface.LIBRARY, RecommendationSurface.QUEUE],
    personaSlugs: ["new-user", "casual-listener"],
    trend: "flat",
    weight: 4,
    templates: [
      "Really like the cleaner look of {surface} after the redesign, feels much easier to navigate now.",
      "Onboarding as a {surface} first-timer was smooth, the app explained features well.",
    ],
  },
  {
    id: "wrapped-love",
    topicSlug: "wrapped-stats",
    polarity: "positive",
    surfaces: [RecommendationSurface.WRAPPED],
    personaSlugs: ["casual-listener", "power-user", "nostalgic-listener"],
    trend: "spiky",
    weight: 5,
    templates: [
      "Already excited for {surface} this year, it's become a genuine yearly tradition with my friends.",
      "{surface} is the one time a year Spotify really makes me feel like it understands my listening habits.",
      "Comparing {surface} results with friends is one of my favorite Spotify moments every year.",
    ],
  },
  {
    id: "friend-activity-privacy",
    topicSlug: "social-features",
    polarity: "negative",
    surfaces: [RecommendationSurface.FRIEND_ACTIVITY],
    personaSlugs: ["power-user", "casual-listener"],
    trend: "flat",
    weight: 4,
    templates: [
      "Wish {surface} had more granular privacy controls, don't always want everyone seeing every track I play.",
      "{surface} feels a bit invasive by default, took a while to find how to turn it off.",
    ],
  },
  {
    id: "collab-playlist-bug",
    topicSlug: "playlist-curation",
    polarity: "negative",
    surfaces: [RecommendationSurface.COLLABORATIVE_PLAYLISTS, RecommendationSurface.PLAYLIST_RECOMMENDATIONS],
    personaSlugs: ["playlist-curator", "social-listener"],
    trend: "flat",
    weight: 6,
    templates: [
      "{surface} keeps duplicating songs whenever multiple people add tracks at the same time.",
      "Recommended additions to {surface} rarely match the vibe the group has actually built.",
      "Lost track order on a {surface} twice this month after a collaborator edited it.",
    ],
  },
  {
    id: "playlist-curation-praise",
    topicSlug: "playlist-curation",
    polarity: "positive",
    surfaces: [RecommendationSurface.PLAYLIST_RECOMMENDATIONS],
    personaSlugs: ["playlist-curator"],
    trend: "flat",
    weight: 4,
    templates: [
      "{surface} suggestions for finishing off my playlists have actually been really well matched lately.",
      "Love how {surface} picks tracks that fit the exact mood of the playlist I'm building.",
    ],
  },
  {
    id: "daylist-niche-praise",
    topicSlug: "music-discovery",
    polarity: "positive",
    surfaces: [RecommendationSurface.DAYLIST],
    personaSlugs: ["music-discoverer", "nostalgic-listener"],
    trend: "rising",
    weight: 6,
    templates: [
      "{surface} named my Tuesday afternoon mix something absurdly specific and it was somehow completely accurate.",
      "Obsessed with how niche {surface} titles get, and the {genre} picks inside actually match the vibe.",
    ],
  },
  {
    id: "smart-shuffle-mixed",
    topicSlug: "personalization-accuracy",
    polarity: "neutral",
    surfaces: [RecommendationSurface.SMART_SHUFFLE],
    personaSlugs: ["casual-listener", "power-user"],
    trend: "flat",
    weight: 5,
    templates: [
      "{surface} adds decent extra tracks to my playlists but sometimes strays pretty far from the original vibe.",
      "Not sure {surface} understands my playlists as well as it thinks it does, mixed results overall.",
    ],
  },
  {
    id: "new-user-onboarding",
    topicSlug: "music-discovery",
    polarity: "neutral",
    surfaces: [RecommendationSurface.MADE_FOR_YOU, RecommendationSurface.DISCOVER_WEEKLY],
    personaSlugs: ["new-user"],
    trend: "flat",
    weight: 5,
    templates: [
      "Just switched from another streaming service, {surface} took a couple weeks to start feeling personalized.",
      "As a new user, I wish {surface} asked more upfront about genres I like instead of learning slowly over time.",
    ],
  },
];

import { RecommendationSurface } from "@prisma/client";

export const SURFACE_LABELS: Record<RecommendationSurface, string> = {
  DISCOVER_WEEKLY: "Discover Weekly",
  RELEASE_RADAR: "Release Radar",
  AI_DJ: "AI DJ",
  DAYLIST: "Daylist",
  BLEND: "Blend",
  SMART_SHUFFLE: "Smart Shuffle",
  MADE_FOR_YOU: "Made For You",
  RADIO: "Radio",
  SEARCH: "Search",
  PLAYLIST_RECOMMENDATIONS: "Playlist Recommendations",
  ARTIST_RADIO: "Artist Radio",
  ALBUM_RECOMMENDATIONS: "Album Recommendations",
  PREMIUM: "Premium",
  ADS: "Ads",
  PODCASTS: "Podcasts",
  OFFLINE_DOWNLOADS: "Offline Downloads",
  LIKED_SONGS: "Liked Songs",
  QUEUE: "Queue",
  LIBRARY: "Library",
  JAM: "Jam",
  WRAPPED: "Wrapped",
  FRIEND_ACTIVITY: "Friend Activity",
  COLLABORATIVE_PLAYLISTS: "Collaborative Playlists",
  OTHER: "Other",
};

export const DISCOVERY_SURFACES: RecommendationSurface[] = [
  RecommendationSurface.DISCOVER_WEEKLY,
  RecommendationSurface.RELEASE_RADAR,
  RecommendationSurface.AI_DJ,
  RecommendationSurface.DAYLIST,
  RecommendationSurface.BLEND,
  RecommendationSurface.SMART_SHUFFLE,
  RecommendationSurface.MADE_FOR_YOU,
  RecommendationSurface.RADIO,
  RecommendationSurface.PLAYLIST_RECOMMENDATIONS,
  RecommendationSurface.ARTIST_RADIO,
  RecommendationSurface.ALBUM_RECOMMENDATIONS,
];

export const TOPIC_TAXONOMY: Array<{ name: string; slug: string; description: string; color: string }> = [
  { name: "Music Discovery", slug: "music-discovery", description: "Finding new music, artists, and genres", color: "#1DB954" },
  { name: "Recommendation Repetition", slug: "recommendation-repetition", description: "Recommendations feel repetitive or stale", color: "#F59E0B" },
  { name: "Personalization Accuracy", slug: "personalization-accuracy", description: "Recommendations not matching taste", color: "#EF4444" },
  { name: "Search Experience", slug: "search-experience", description: "Search relevance and usability", color: "#3B82F6" },
  { name: "Playlist Curation", slug: "playlist-curation", description: "Auto-generated and collaborative playlists", color: "#8B5CF6" },
  { name: "Podcasts", slug: "podcasts", description: "Podcast discovery and playback", color: "#EC4899" },
  { name: "Premium & Pricing", slug: "premium-pricing", description: "Subscription tiers and pricing", color: "#14B8A6" },
  { name: "Ads Experience", slug: "ads-experience", description: "Ad frequency and relevance on free tier", color: "#F97316" },
  { name: "Playback & Offline", slug: "playback-offline", description: "Streaming quality, downloads, offline mode", color: "#6366F1" },
  { name: "Social Features", slug: "social-features", description: "Jam, Friend Activity, Blend, collaborative playlists", color: "#06B6D4" },
  { name: "Wrapped & Stats", slug: "wrapped-stats", description: "Yearly Wrapped and listening stats", color: "#84CC16" },
  { name: "App Performance", slug: "app-performance", description: "Bugs, crashes, and performance issues", color: "#64748B" },
  { name: "UI/UX", slug: "ui-ux", description: "Navigation, design, ease of use", color: "#A855F7" },
];

export const PERSONA_TAXONOMY: Array<{ name: string; slug: string; description: string; color: string }> = [
  { name: "Casual Listener", slug: "casual-listener", description: "Listens occasionally, mostly to familiar music", color: "#22C55E" },
  { name: "Power User", slug: "power-user", description: "Heavy daily usage, explores features deeply", color: "#1DB954" },
  { name: "Music Discoverer", slug: "music-discoverer", description: "Actively seeks new artists and genres", color: "#3B82F6" },
  { name: "Podcast Enthusiast", slug: "podcast-enthusiast", description: "Primarily uses Spotify for podcasts", color: "#EC4899" },
  { name: "Free-Tier User", slug: "free-tier-user", description: "Ad-supported, price sensitive", color: "#F59E0B" },
  { name: "Audiophile", slug: "audiophile", description: "Cares about audio quality and library control", color: "#8B5CF6" },
  { name: "Playlist Curator", slug: "playlist-curator", description: "Builds and shares playlists actively", color: "#14B8A6" },
  { name: "New User", slug: "new-user", description: "Recently onboarded, still learning the app", color: "#94A3B8" },
  { name: "Social Listener", slug: "social-listener", description: "Uses Jam, Blend, and friend activity often", color: "#06B6D4" },
  { name: "Nostalgic Listener", slug: "nostalgic-listener", description: "Prefers familiar/throwback music over discovery", color: "#F97316" },
];

export const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_PLAY: "Google Play Store",
  APP_STORE: "Apple App Store",
  REDDIT: "Reddit",
  SPOTIFY_COMMUNITY: "Spotify Community",
  TWITTER: "X (Twitter)",
  YOUTUBE: "YouTube Comments",
  GOOGLE_NEWS: "Google News",
  NEWSAPI: "News API",
  MEDIUM: "Medium",
  BLOG: "Public Blogs",
};

export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  DE: "Germany", FR: "France", BR: "Brazil", IN: "India", MX: "Mexico",
  JP: "Japan", SE: "Sweden", NL: "Netherlands", ES: "Spain", IT: "Italy",
  KR: "South Korea", ID: "Indonesia", PH: "Philippines", NG: "Nigeria",
  ZA: "South Africa", PL: "Poland",
};

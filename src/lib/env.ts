import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),

  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_CHAT_MODEL: z.string().default("gpt-5.5"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-large"),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),

  // Groq (https://groq.com) is an OpenAI-compatible chat completion provider
  // with a free tier. It has no embeddings model, so embeddings still fall
  // back to the deterministic heuristic unless OPENAI_API_KEY is also set
  // with usable quota. When both are configured, Groq is preferred for chat
  // completions since it's free; OpenAI (if it has quota) is used for
  // embeddings only.
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_CHAT_MODEL: z.string().default("openai/gpt-oss-20b"),

  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: z.string().optional().default(""),
  GOOGLE_PLAY_PACKAGE_NAME: z.string().default("com.spotify.music"),
  APPLE_APP_ID: z.string().default("324684580"),
  APPLE_APP_STORE_COUNTRY: z.string().default("us"),
  REDDIT_CLIENT_ID: z.string().optional().default(""),
  REDDIT_CLIENT_SECRET: z.string().optional().default(""),
  REDDIT_USER_AGENT: z.string().default("spotify-voc-intel/1.0"),
  TWITTER_BEARER_TOKEN: z.string().optional().default(""),
  YOUTUBE_API_KEY: z.string().optional().default(""),
  YOUTUBE_VIDEO_IDS: z.string().optional().default(""),
  NEWSAPI_API_KEY: z.string().optional().default(""),
  GOOGLE_NEWS_RSS_QUERY: z.string().default("Spotify recommendations OR Spotify discovery"),
  MEDIUM_RSS_USERNAMES: z.string().optional().default(""),

  SLACK_WEBHOOK_URL: z.string().optional().default(""),
  NOTIFICATION_EMAIL_TO: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),

  CRON_SECRET: z.string().default("dev-cron-secret-change-me"),

  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().default("https://app.posthog.com"),
  SENTRY_DSN: z.string().optional().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();

export const hasOpenAI = () => Boolean(env.OPENAI_API_KEY);
export const hasGroq = () => Boolean(env.GROQ_API_KEY);
/** Any provider capable of chat completions / structured-output enrichment. */
export const hasChatAI = () => hasGroq() || hasOpenAI();
/** Only OpenAI provides embeddings among the configured providers. */
export const hasEmbeddingAI = () => hasOpenAI();
export const hasSupabase = () => Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

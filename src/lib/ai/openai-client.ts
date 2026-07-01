import OpenAI from "openai";
import { env, hasOpenAI, hasGroq, hasChatAI } from "@/lib/env";

let openaiClient: OpenAI | null = null;
let groqClient: OpenAI | null = null;

/** Client for OpenAI-only capabilities (currently: embeddings). */
export function getOpenAI(): OpenAI {
  if (!hasOpenAI()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Client for chat completions / structured-output enrichment. Prefers Groq
 * (free, OpenAI-compatible) when configured, falling back to OpenAI. Both
 * expose the same `openai` SDK interface since Groq implements the
 * OpenAI-compatible chat completions API.
 */
export function getChatClient(): OpenAI {
  if (!hasChatAI()) {
    throw new Error("Neither GROQ_API_KEY nor OPENAI_API_KEY is configured");
  }
  if (hasGroq()) {
    if (!groqClient) {
      groqClient = new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
    }
    return groqClient;
  }
  return getOpenAI();
}

export const CHAT_PROVIDER: "groq" | "openai" = hasGroq() ? "groq" : "openai";
export const CHAT_MODEL = hasGroq() ? env.GROQ_CHAT_MODEL : env.OPENAI_CHAT_MODEL;
export const EMBEDDING_MODEL = env.OPENAI_EMBEDDING_MODEL;
export const EMBEDDING_DIMENSIONS = env.EMBEDDING_DIMENSIONS;

/**
 * Groq's free tier is token-per-minute limited, and gpt-oss models spend a
 * large chunk of that budget on hidden reasoning tokens by default (~800+
 * per call). Capping effort to "low" cuts that to ~200 while keeping
 * structured-output quality, roughly tripling achievable throughput.
 * OpenAI's models ignore/don't need this, so only set it for Groq.
 */
export const REASONING_EFFORT_OPTION = CHAT_PROVIDER === "groq" ? ({ reasoning_effort: "low" } as const) : {};

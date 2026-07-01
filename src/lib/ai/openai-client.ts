import OpenAI from "openai";
import { env, hasOpenAI } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!hasOpenAI()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export const CHAT_MODEL = env.OPENAI_CHAT_MODEL;
export const EMBEDDING_MODEL = env.OPENAI_EMBEDDING_MODEL;
export const EMBEDDING_DIMENSIONS = env.EMBEDDING_DIMENSIONS;

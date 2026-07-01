import { createHash } from "node:crypto";
import { hasOpenAI } from "@/lib/env";
import { getOpenAI, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/ai/openai-client";

/**
 * Deterministic pseudo-embedding used when OPENAI_API_KEY is absent, so the
 * pipeline, pgvector storage, and similarity search all still function end
 * to end in a fully offline demo. Built from term hashing (not real
 * semantics) - swap in real OpenAI embeddings by setting OPENAI_API_KEY.
 */
function fallbackEmbedding(text: string, dims = EMBEDDING_DIMENSIONS): number[] {
  const vector = new Array(dims).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    for (let i = 0; i < 8; i++) {
      const idx = hash.readUInt16BE(i * 2) % dims;
      const sign = hash[i] % 2 === 0 ? 1 : -1;
      vector[idx] += sign;
    }
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  if (!hasOpenAI()) {
    return fallbackEmbedding(text);
  }
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!hasOpenAI()) {
    return texts.map((t) => fallbackEmbedding(t));
  }
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8000)),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data.map((d) => d.embedding);
}

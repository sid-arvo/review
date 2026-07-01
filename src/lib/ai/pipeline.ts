import { Annotation, StateGraph, END, START } from "@langchain/langgraph";
import { ProcessingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cleanText, detectLanguage } from "@/lib/ai/clean-text";
import { translateToEnglish } from "@/lib/ai/translate";
import { embedText } from "@/lib/ai/embeddings";
import { findExactDuplicate, findNearDuplicate } from "@/lib/ai/dedupe";
import { heuristicEnrich } from "@/lib/ai/heuristics";
import { llmEnrich } from "@/lib/ai/llm-enrich";
import { hasOpenAI } from "@/lib/env";
import { setReviewEmbedding } from "@/lib/vector";
import { persistEnrichment } from "@/lib/ai/persist";
import type { EnrichmentResult } from "@/lib/ai/types";

const PipelineState = Annotation.Root({
  reviewId: Annotation<string>(),
  originalText: Annotation<string>(),
  ratingHint: Annotation<number | undefined>(),
  cleanedText: Annotation<string>(),
  language: Annotation<string>(),
  translatedText: Annotation<string | undefined>(),
  textForAnalysis: Annotation<string>(),
  embedding: Annotation<number[] | undefined>(),
  duplicateOfId: Annotation<string | null>(),
  enrichment: Annotation<EnrichmentResult | undefined>(),
});

type PipelineStateType = typeof PipelineState.State;

async function cleanNode(state: PipelineStateType) {
  const cleaned = cleanText(state.originalText);
  const language = detectLanguage(cleaned);
  return { cleanedText: cleaned, language };
}

async function translateNode(state: PipelineStateType) {
  const translatedText = await translateToEnglish(state.cleanedText, state.language);
  return { translatedText, textForAnalysis: translatedText ?? state.cleanedText };
}

async function embedNode(state: PipelineStateType) {
  const embedding = await embedText(state.textForAnalysis);
  return { embedding };
}

async function dedupeNode(state: PipelineStateType) {
  const exact = await findExactDuplicate(state.textForAnalysis, state.reviewId);
  if (exact) return { duplicateOfId: exact };
  if (state.embedding) {
    const near = await findNearDuplicate(state.embedding, state.reviewId);
    if (near) return { duplicateOfId: near };
  }
  return { duplicateOfId: null };
}

function routeAfterDedupe(state: PipelineStateType) {
  return state.duplicateOfId ? "persistDuplicate" : "enrich";
}

async function enrichNode(state: PipelineStateType) {
  const enrichment = hasOpenAI()
    ? await llmEnrich(state.textForAnalysis, state.ratingHint)
    : heuristicEnrich(state.originalText, state.textForAnalysis, state.ratingHint);

  return {
    enrichment: {
      ...enrichment,
      cleanText: state.cleanedText,
      language: state.language,
      translatedText: state.translatedText,
    },
  };
}

async function persistNode(state: PipelineStateType) {
  if (!state.enrichment) throw new Error("Missing enrichment result at persist step");
  if (state.embedding) await setReviewEmbedding(state.reviewId, state.embedding);
  await persistEnrichment(state.reviewId, state.enrichment);
  return {};
}

async function persistDuplicateNode(state: PipelineStateType) {
  await prisma.review.update({
    where: { id: state.reviewId },
    data: {
      isDuplicate: true,
      duplicateOfId: state.duplicateOfId,
      processingStatus: ProcessingStatus.DUPLICATE,
      cleanText: state.cleanedText,
      processedAt: new Date(),
    },
  });
  return {};
}

const graph = new StateGraph(PipelineState)
  .addNode("clean", cleanNode)
  .addNode("translate", translateNode)
  .addNode("embed", embedNode)
  .addNode("dedupe", dedupeNode)
  .addNode("enrich", enrichNode)
  .addNode("persist", persistNode)
  .addNode("persistDuplicate", persistDuplicateNode)
  .addEdge(START, "clean")
  .addEdge("clean", "translate")
  .addEdge("translate", "embed")
  .addEdge("embed", "dedupe")
  .addConditionalEdges("dedupe", routeAfterDedupe, { enrich: "enrich", persistDuplicate: "persistDuplicate" })
  .addEdge("enrich", "persist")
  .addEdge("persist", END)
  .addEdge("persistDuplicate", END);

export const enrichmentGraph = graph.compile();

export async function runEnrichmentPipeline(reviewId: string): Promise<void> {
  const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
  await prisma.review.update({ where: { id: reviewId }, data: { processingStatus: ProcessingStatus.PROCESSING } });

  try {
    await enrichmentGraph.invoke({
      reviewId,
      originalText: review.originalText,
      ratingHint: review.rating ?? undefined,
    });
  } catch (err) {
    await prisma.review.update({
      where: { id: reviewId },
      data: { processingStatus: ProcessingStatus.FAILED, processingError: (err as Error).message },
    });
    throw err;
  }
}

export async function runEnrichmentBatch(reviewIds: string[], concurrency = 5): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  const queue = [...reviewIds];

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) return;
      try {
        await runEnrichmentPipeline(id);
        processed++;
      } catch (err) {
        failed++;
        console.error(`[pipeline] failed for review ${id}:`, (err as Error).message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, reviewIds.length) }, worker));
  return { processed, failed };
}

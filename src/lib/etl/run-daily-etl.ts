import { CronJobStatus, ProcessingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CONNECTORS } from "@/lib/ingestion/registry";
import { runEnrichmentBatch } from "@/lib/ai/pipeline";
import { runClustering } from "@/lib/ai/clustering";
import { computeTrendSnapshots } from "@/lib/ai/trends";
import { generateExecutiveSummary } from "@/lib/ai/executive-summary";
import { notifyAll } from "@/lib/notifications/notify";

const MAX_ATTEMPTS = 3;

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      console.error(`[etl] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
}

export interface EtlSummary {
  cronRunId: string;
  status: CronJobStatus;
  fetched: number;
  new: number;
  processed: number;
  failed: number;
  durationMs: number;
}

// If a prior run's serverless invocation got killed mid-flight (e.g. it
// exceeded maxDuration), its CronRun row is left stuck at RUNNING forever
// since nothing ever reaches the final status update. Reconcile those before
// starting a new run so the cron dashboard doesn't show a permanently-stuck
// job and so this doesn't accumulate one orphaned row per timeout.
const STALE_RUN_THRESHOLD_MS = 10 * 60 * 1000;

async function reconcileStaleRuns(): Promise<void> {
  await prisma.cronRun.updateMany({
    where: {
      status: CronJobStatus.RUNNING,
      startedAt: { lt: new Date(Date.now() - STALE_RUN_THRESHOLD_MS) },
    },
    data: {
      status: CronJobStatus.FAILED,
      finishedAt: new Date(),
      error: "Run exceeded the serverless function time limit and never reported back; marked failed by a later invocation.",
    },
  });
}

const INSERT_BATCH_SIZE = 100;

export async function runDailyEtl(): Promise<EtlSummary> {
  const startedAt = Date.now();
  await reconcileStaleRuns();
  const cronRun = await prisma.cronRun.create({ data: { jobName: "daily-etl", status: CronJobStatus.RUNNING } });

  let totalFetched = 0;
  let totalNew = 0;
  let sourceFailures = 0;

  for (const [source, connector] of Object.entries(CONNECTORS)) {
    const sourceStartedAt = Date.now();
    try {
      const result = await withRetry(() => connector(), `ingest:${source}`);
      totalFetched += result.reviews.length;

      // Batched instead of one create() per review: the DB pooler is a
      // cross-region hop, so hundreds of sequential round trips here is what
      // was blowing through the function's time limit on real ETL runs.
      let itemsNew = 0;
      for (let i = 0; i < result.reviews.length; i += INSERT_BATCH_SIZE) {
        const chunk = result.reviews.slice(i, i + INSERT_BATCH_SIZE);
        const existing = await prisma.review.findMany({
          where: { source: result.source, externalId: { in: chunk.map((r) => r.externalId) } },
          select: { externalId: true },
        });
        const existingIds = new Set(existing.map((e) => e.externalId));
        itemsNew += chunk.filter((r) => !existingIds.has(r.externalId)).length;

        await prisma.review.createMany({
          data: chunk.map((raw) => ({
            source: raw.source,
            externalId: raw.externalId,
            externalUrl: raw.externalUrl,
            authorName: raw.authorName,
            authorHandle: raw.authorHandle,
            rating: raw.rating,
            country: raw.country,
            originalText: raw.originalText,
            publishedAt: raw.publishedAt,
            rawJson: raw.rawJson as object | undefined,
          })),
          skipDuplicates: true,
        });
      }
      totalNew += itemsNew;

      await prisma.ingestionLog.create({
        data: {
          cronRunId: cronRun.id,
          source: result.source,
          status: "SUCCESS",
          itemsFetched: result.reviews.length,
          itemsNew,
          usedFallback: result.usedFallback,
          message: result.message,
          finishedAt: new Date(),
          durationMs: Date.now() - sourceStartedAt,
        },
      });
    } catch (err) {
      sourceFailures++;
      await prisma.ingestionLog.create({
        data: {
          cronRunId: cronRun.id,
          source: source as never,
          status: "FAILED",
          itemsFailed: 1,
          message: (err as Error).message,
          finishedAt: new Date(),
          durationMs: Date.now() - sourceStartedAt,
        },
      });
    }
  }

  const pendingReviews = await prisma.review.findMany({
    where: { processingStatus: ProcessingStatus.PENDING },
    select: { id: true },
    take: 5000,
  });

  let processed = 0;
  let failed = 0;
  try {
    const result = await runEnrichmentBatch(
      pendingReviews.map((r) => r.id),
      8
    );
    processed = result.processed;
    failed = result.failed;
  } catch (err) {
    console.error("[etl] enrichment batch failed:", (err as Error).message);
  }

  try {
    await runClustering();
  } catch (err) {
    console.error("[etl] clustering failed:", (err as Error).message);
  }

  try {
    await computeTrendSnapshots(180);
  } catch (err) {
    console.error("[etl] trend computation failed:", (err as Error).message);
  }

  let headline: string | undefined;
  try {
    const summary = await generateExecutiveSummary(1);
    headline = summary.headline;
  } catch (err) {
    console.error("[etl] executive summary generation failed:", (err as Error).message);
  }

  const durationMs = Date.now() - startedAt;
  const status: CronJobStatus = sourceFailures === 0 && failed === 0 ? CronJobStatus.SUCCESS : sourceFailures === Object.keys(CONNECTORS).length ? CronJobStatus.FAILED : CronJobStatus.PARTIAL;

  await prisma.cronRun.update({
    where: { id: cronRun.id },
    data: {
      status,
      finishedAt: new Date(),
      durationMs,
      stats: { fetched: totalFetched, new: totalNew, processed, failed, sourceFailures },
    },
  });

  await notifyAll({
    status,
    fetched: totalFetched,
    processed,
    failed,
    durationMs,
    headline,
  });

  return { cronRunId: cronRun.id, status, fetched: totalFetched, new: totalNew, processed, failed, durationMs };
}

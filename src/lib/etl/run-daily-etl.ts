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

export async function runDailyEtl(): Promise<EtlSummary> {
  const startedAt = Date.now();
  const cronRun = await prisma.cronRun.create({ data: { jobName: "daily-etl", status: CronJobStatus.RUNNING } });

  let totalFetched = 0;
  let totalNew = 0;
  let sourceFailures = 0;

  for (const [source, connector] of Object.entries(CONNECTORS)) {
    const sourceStartedAt = Date.now();
    try {
      const result = await withRetry(() => connector(), `ingest:${source}`);
      totalFetched += result.reviews.length;

      let itemsNew = 0;
      for (const raw of result.reviews) {
        const created = await prisma.review
          .create({
            data: {
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
            },
            select: { id: true },
          })
          .catch((err: { code?: string }) => (err.code === "P2002" ? null : Promise.reject(err)));
        if (created) itemsNew++;
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

/**
 * Standalone BullMQ worker process for queue-based ETL processing.
 *
 * The Vercel Cron route (`/api/cron/daily-etl`) runs the pipeline inline for
 * simplicity and works fine within serverless time limits at demo volume. For
 * higher-volume production use, point ingestion at these queues instead (see
 * `enqueueDailyIngestion`) and run this worker as a long-lived process
 * (Docker/Fly/Railway/a small VM) so ingestion, AI enrichment, and
 * aggregation scale independently of serverless execution limits.
 *
 * Run with: pnpm worker
 */
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { SourceType, ProcessingStatus } from "@prisma/client";
import { getRedisConnection } from "@/lib/queue/connection";
import { QUEUE_NAMES } from "@/lib/queue/queues";
import { CONNECTORS } from "@/lib/ingestion/registry";
import { prisma } from "@/lib/prisma";
import { runEnrichmentBatch } from "@/lib/ai/pipeline";
import { runClustering } from "@/lib/ai/clustering";
import { computeTrendSnapshots } from "@/lib/ai/trends";
import { generateExecutiveSummary } from "@/lib/ai/executive-summary";
import { notifyAll } from "@/lib/notifications/notify";
import { getEnrichmentQueue } from "@/lib/queue/queues";

const connection = getRedisConnection();

const ingestionWorker = new Worker(
  QUEUE_NAMES.INGESTION,
  async (job: Job<{ source: SourceType }>) => {
    const { source } = job.data;
    const connector = CONNECTORS[source];
    if (!connector) throw new Error(`No ingestion connector registered for source ${source}`);
    const result = await connector();

    const newIds: string[] = [];
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
      if (created) newIds.push(created.id);
    }

    if (newIds.length > 0) {
      const enrichmentQueue = getEnrichmentQueue();
      for (let i = 0; i < newIds.length; i += 50) {
        await enrichmentQueue.add("enrich-batch", { reviewIds: newIds.slice(i, i + 50) });
      }
    }

    console.log(`[worker:ingestion] ${source}: fetched ${result.reviews.length}, new ${newIds.length}, fallback=${result.usedFallback}`);
    return { fetched: result.reviews.length, new: newIds.length };
  },
  { connection, concurrency: 4 }
);

const enrichmentWorker = new Worker(
  QUEUE_NAMES.ENRICHMENT,
  async (job: Job<{ reviewIds: string[] }>) => {
    const { processed, failed } = await runEnrichmentBatch(job.data.reviewIds, 6);
    console.log(`[worker:enrichment] processed ${processed}, failed ${failed}`);
    return { processed, failed };
  },
  { connection, concurrency: 2 }
);

const aggregationWorker = new Worker(
  QUEUE_NAMES.AGGREGATION,
  async () => {
    await runClustering();
    await computeTrendSnapshots(180);
    const summary = await generateExecutiveSummary(1);
    const pending = await prisma.review.count({ where: { processingStatus: ProcessingStatus.PENDING } });
    await notifyAll({ status: "SUCCESS", fetched: 0, processed: 0, failed: pending, durationMs: 0, headline: summary.headline });
    console.log("[worker:aggregation] clustering + trends + executive summary refreshed");
  },
  { connection, concurrency: 1 }
);

for (const worker of [ingestionWorker, enrichmentWorker, aggregationWorker]) {
  worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));
}

console.log("Spotify VoC ETL workers started. Listening on ingestion, enrichment, and aggregation queues...");

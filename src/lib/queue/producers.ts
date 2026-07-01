import { SourceType } from "@prisma/client";
import { getIngestionQueue, getAggregationQueue } from "@/lib/queue/queues";

/** Enqueues one ingestion job per source. Consumed by the BullMQ worker (see src/workers/index.ts). */
export async function enqueueDailyIngestion(): Promise<{ enqueued: number }> {
  const queue = getIngestionQueue();
  const sources = Object.values(SourceType);
  await queue.addBulk(sources.map((source) => ({ name: "ingest-source", data: { source } })));
  return { enqueued: sources.length };
}

export async function enqueueAggregation(): Promise<void> {
  const queue = getAggregationQueue();
  await queue.add("aggregate", {});
}

/** Registers a repeatable aggregation job so clustering/trends/summaries stay fresh even between ETL runs. */
export async function scheduleRepeatableAggregation(): Promise<void> {
  const queue = getAggregationQueue();
  await queue.upsertJobScheduler("nightly-aggregation", { pattern: "30 0 * * *" }, { name: "aggregate", data: {} });
}

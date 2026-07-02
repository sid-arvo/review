import { ACTIVE_SOURCES } from "@/lib/domain/spotify";
import { getIngestionQueue, getAggregationQueue } from "@/lib/queue/queues";

/** Enqueues one ingestion job per source. Consumed by the BullMQ worker (see src/workers/index.ts). */
export async function enqueueDailyIngestion(): Promise<{ enqueued: number }> {
  const queue = getIngestionQueue();
  await queue.addBulk(ACTIVE_SOURCES.map((source) => ({ name: "ingest-source", data: { source } })));
  return { enqueued: ACTIVE_SOURCES.length };
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

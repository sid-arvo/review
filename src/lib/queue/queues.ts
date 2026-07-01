import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";

export const QUEUE_NAMES = {
  INGESTION: "voc:ingestion",
  ENRICHMENT: "voc:enrichment",
  AGGREGATION: "voc:aggregation",
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { age: 3600 * 24 * 7, count: 1000 },
  removeOnFail: { age: 3600 * 24 * 30 },
};

let ingestionQueue: Queue | null = null;
let enrichmentQueue: Queue | null = null;
let aggregationQueue: Queue | null = null;

export function getIngestionQueue() {
  if (!ingestionQueue) {
    ingestionQueue = new Queue(QUEUE_NAMES.INGESTION, {
      connection: getRedisConnection(),
      defaultJobOptions,
    });
  }
  return ingestionQueue;
}

export function getEnrichmentQueue() {
  if (!enrichmentQueue) {
    enrichmentQueue = new Queue(QUEUE_NAMES.ENRICHMENT, {
      connection: getRedisConnection(),
      defaultJobOptions,
    });
  }
  return enrichmentQueue;
}

export function getAggregationQueue() {
  if (!aggregationQueue) {
    aggregationQueue = new Queue(QUEUE_NAMES.AGGREGATION, {
      connection: getRedisConnection(),
      defaultJobOptions,
    });
  }
  return aggregationQueue;
}

import IORedis from "ioredis";
import { env } from "@/lib/env";

let connection: IORedis | null = null;

/** Shared ioredis connection for BullMQ. BullMQ requires maxRetriesPerRequest: null. */
export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    connection.on("error", (err) => {
      console.error("[redis] connection error", err.message);
    });
  }
  return connection;
}

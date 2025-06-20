import { RedisClientType } from "redis";

/** Ensure a consumer-group exists (no-op if it already does) */
export async function createConsumerGroup(
  redis: RedisClientType,
  stream: string,
  consumerGroup: string
): Promise<void> {
  try {
    await redis.xGroupCreate(stream, consumerGroup, "0", { MKSTREAM: true });
    console.log(`[outStream] ${consumerGroup} created on ${stream}`);
  } catch (err: any) {
    if (!String(err?.message).includes("BUSYGROUP")) throw err;
    console.log(`[outStream] consumerGroup: ${consumerGroup} already exists`);
  }
}

/** Read *new* entries for this consumer, blocking up to `blockMs` */
export async function readGroup(
  redis: RedisClientType,
  stream: string,
  group: string,
  consumer: string,
  blockMs = 0,
  count = 10
) {
  return redis.xReadGroup(
    group,
    consumer,
    { key: stream, id: ">" },          // “>” means only new entries
    { BLOCK: blockMs, COUNT: count }
  );
}

export function ack(
  redis: RedisClientType,
  stream: string,
  group: string,
  ids: string[]
) {
  return redis.xAck(stream, group, ids);
}

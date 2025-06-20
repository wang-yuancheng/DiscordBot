import { getRedisClient } from "../clients/redis";
import { handleVerdict } from "./processor";
import { createConsumerGroup, readGroup, ack } from "./consumerGroup";

const STREAM_KEY   = "replyStream";
const GROUP_NAME   = "replyStreamCG";
const CONSUMER     = `bot-${process.pid}`;
const BLOCK_MS     = 1000;  // Waits up to 1s for new messages in Redis stream before continuing
const BATCH        = 10;    // max messages per read
let running = false

export async function startReplyListener(): Promise<void> {
  const redis = getRedisClient();
  await createConsumerGroup(redis, STREAM_KEY, GROUP_NAME);

  running = true;

  while (running) {
    try {
      const streams = await readGroup(
        redis,
        STREAM_KEY,
        GROUP_NAME,
        CONSUMER,
        BLOCK_MS,
        BATCH
      );
      if (!running) break; 
      if (!streams) continue;

      const ackIds: string[] = [];

      for (const s of streams) {
        for (const msg of s.messages) {
          const data = msg.message as Record<string, string>;
          await handleVerdict(data);
          ackIds.push(msg.id);
        }
      }
      if (ackIds.length) await ack(redis, STREAM_KEY, GROUP_NAME, ackIds);
    } catch (err) {
      console.error("Reply listener error:", err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.log("Stopped read from outStream")
}

export function stopReplyListener(): void {
  console.log("Stopping read from outStream")
  running = false;
}

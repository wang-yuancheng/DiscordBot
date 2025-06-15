import { RedisClientType, createClient } from "redis";

let client: RedisClientType | null = null;

async function initRedisClient(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (client?.isOpen) return;
  if (!redisUrl) throw new Error("REDIS_URL is not defined in .env");

  client = createClient({ url: redisUrl });

  client.on("error", (err) => {
    console.error("Redis Error", err);
  });

  await client.connect();
  console.log("Connected to Redis");
}

export async function connectRedisClient(): Promise<void> {
  try {
    await initRedisClient();
  } catch (err) {
    console.error("Redis Connection Failed", err);
    process.exit(1);
  }
}

export function getRedisClient(): RedisClientType {
  if (!client) throw new Error("Redis client is not connected");
  return client;
}

import { getRedisClient } from "./redis";
import { getDiscordClient } from "./discord";

export function registerShutdownHooks(): void {
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function shutdown() {
  const redis = getRedisClient();
  if (redis?.isOpen) {
    console.log("Shutting down Redis Client...");
    await redis.quit();
    console.log("Redis Client Shut Down");
  }

  const discordClient = getDiscordClient();
  if (discordClient.isReady()) {
    console.log("Shutting down Discord client...");
    discordClient.destroy();
    console.log("Discord Client Shut Down");
  }

  process.exitCode = 0
}


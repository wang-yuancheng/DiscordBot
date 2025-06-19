import { getRedisClient }   from "../clients/redis";
import { getDiscordClient } from "../clients/discord";
import { stopReplyListener } from "../rdb/consumer";

let shuttingDown = false;           

export function registerShutdownHooks(): void {
  process.on("SIGINT",  shutdown);
  process.on("SIGTERM", shutdown);
}

async function shutdown(): Promise<void> {
  if (shuttingDown) return;         // ignore second signal
  shuttingDown = true;

  stopReplyListener();              

  const discord = getDiscordClient();
  if (discord.isReady()) {
    console.log("Shutting down Discord client…");
    discord.destroy();
    console.log("Discord Client Shut Down");
  }

  const redis = getRedisClient();
  if (redis?.isOpen) {
    console.log("Shutting down Redis Client…");
    await redis.quit();
    console.log("Redis Client Shut Down");
  }

  process.exit(0);
}

import * as dotenv from "dotenv";
import { connectDiscordClient, getDiscordClient } from "./discord";
import { connectRedisClient, getRedisClient } from "./redis";
import { registerShutdownHooks } from "./shutdown";
import startMessageListener from "./events/messages";

dotenv.config();

(async () => {
  if (!process.env.BOT_TOKEN || !process.env.REDIS_URL) {
    console.error("Error: Ensure environment variables are defined");
    process.exit(1);
  }
  await connectRedisClient();
  await connectDiscordClient();
  startMessageListener();
  registerShutdownHooks();
})();

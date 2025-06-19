import * as dotenv from "dotenv";
import { connectDiscordClient, getDiscordClient } from "./clients/discord";
import { connectRedisClient, getRedisClient } from "./clients/redis";
import { registerShutdownHooks } from "./utils/shutdown";
import {
  startMessageListener,
  sendMessageToRedisStream,
} from "./events/messages";
import { startReplyListener } from "./rdb/consumer";

dotenv.config();
registerShutdownHooks();

(async () => {
  if (!process.env.BOT_TOKEN || !process.env.REDIS_URL) {
    console.error("Error: Ensure environment variables are defined");
    process.exit(1);
  }
  await connectRedisClient();
  await connectDiscordClient();
  startMessageListener();
  sendMessageToRedisStream();
  startReplyListener();
})();

import * as dotenv from "dotenv";
import { connectDiscordClient, getDiscordClient } from "./discord";
import { connectRedisClient, getRedisClient } from "./redis";
import startMessageListener from "./events/messages";

dotenv.config();

(async () => {
  await connectRedisClient();
  await connectDiscordClient();
  startMessageListener();
})();
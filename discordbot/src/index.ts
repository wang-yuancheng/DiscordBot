import "dotenv/config";
import { connectDiscordClient, getDiscordClient } from "./clients/discord";
import { connectRedisClient, getRedisClient } from "./clients/redis";
import { registerShutdownHooks } from "./utils/shutdown";
import {
  startMessageListener,
  sendMessageToRedisStream,
} from "./events/messages";
import { startReplyListener } from "./redis-streams/consumer";
import { startInteractionListener } from "./events/executeCommands";
import { registerCommandsInGuild } from "./utils/registerGuildCommands";

registerShutdownHooks();

(async () => {
  if (!process.env.BOT_TOKEN || !process.env.REDIS_URL) {
    console.error("Error: Ensure environment variables are defined");
    process.exit(1);
  }
  await connectRedisClient();
  await connectDiscordClient();

  const client = getDiscordClient();

  // register commands for all guilds bot is already in
  for (const [, guild] of client.guilds.cache) {
    await registerCommandsInGuild(guild);
  }

  // register commands for new guilds bot just joined
  client.on("guildCreate", async (guild) => {
    await registerCommandsInGuild(guild);
  });

  startInteractionListener();
  startMessageListener();
  sendMessageToRedisStream();
  startReplyListener();
})();

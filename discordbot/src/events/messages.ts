import { GuildTextBasedChannel, Message } from "discord.js";
import { getDiscordClient } from "../discord";
import { getRedisClient } from "../redis";

export function startMessageListener() {
  const client = getDiscordClient();

  // Print message to console
  client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    console.log(`[${message.author.tag}] ${message.content}`);
  });
}

export function sendMessageToRedisStream() {
  const client = getDiscordClient();

  client.on("messageCreate", async (message: Message) => {
    // Ignore message if it's sent by the bot itself or if it's not from a guild
    if (message.author.id === message.client.user?.id || !message.guild) {
      return;
    }

    const channelName = (message.channel as GuildTextBasedChannel)?.name;
    if (!channelName) {
      console.log("Channel is not a text-based guild channel or has no name");
      return;
    }

    const messageEntry: Record<string, string> = {
      id: message.id,
      content: String(message.content),
      authorID: message.author?.id ?? "unknown",
      authorUsername: message.author?.username ?? "unknown",
      channelID: message.channel?.id ?? "unknown",
      channelName: channelName ?? "unknown",
      guildID: message.guild?.id ?? "DM",
      guildName: message.guild?.name ?? "Direct Message",
      createdTimestamp: message.createdTimestamp.toString(),
    };

    const redisClient = getRedisClient();
    try {
      await redisClient.xAdd("messageStream", "*", messageEntry);
      console.log("Message added to Redis stream");
    } catch (err) {
      console.error("❌ Failed to add message to Redis stream:", err);
    }
  });
}

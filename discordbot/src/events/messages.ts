import { GuildTextBasedChannel, Message } from "discord.js";
import { getDiscordClient } from "../discord";
import { getRedisClient } from "../redis";

function isScannable(message: Message): boolean {
  return !message.author.bot          // skip bots
      && !!message.guild;             // skip DMs
}

export function startMessageListener() {
  const client = getDiscordClient();

  client.on("messageCreate", (message) => {
    if (!isScannable(message)) return;
    console.log(`[${message.author.tag}] ${message.content}`);
  });
}

export function sendMessageToRedisStream() {
  const client = getDiscordClient();

  client.on("messageCreate", async (message: Message) => {
    if (!isScannable(message)) return;

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
      authorTimeInServer: message.member?.joinedTimestamp?.toString() ?? "unknown",
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
      console.error("Failed to add message to Redis stream:", err);
    }
  });
}

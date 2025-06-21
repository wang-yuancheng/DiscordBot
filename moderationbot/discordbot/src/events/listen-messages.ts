import { GuildTextBasedChannel, Message, MessageType } from "discord.js";
import { getDiscordClient } from "../clients/discord";
import { getRedisClient } from "../clients/redis";

function isScannable(message: Message): boolean {
  return (
    !message.author.bot && // skip bots
    !!message.guild
  ); // skip DMs
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
      messageID: message.id,
      authorID: message.author?.id ?? "unknown",
      authorUsername: message.author?.username ?? "unknown",
      channelID: message.channel?.id ?? "unknown",
      channelName: channelName ?? "unknown",
      guildID: message.guild?.id ?? "DM",
      guildName: message.guild?.name ?? "Direct Message",

      // ------ Attributes machine learning model expects are below -------
      content: String(message.content),
      // createTimestamp: milliseconds since Jan 1, 1970 (Unix epoch)
      msgCreatedTimestamp: message.createdTimestamp.toString(),
      // authorTimeInServer: milliseconds since Jan 1, 1970 (Unix epoch)
      authorTimeInServer:
        message.member?.joinedTimestamp?.toString() ?? "unknown",
      messageLength: message.content.length.toString(),
      wordCount: message.content.trim().split(/\s+/).length.toString(),
      hasLink: /https?:\/\//i.test(message.content) ? "1" : "0",
      hasMention:
        message.mentions.users.size > 0 || message.mentions.roles.size > 0
          ? "1"
          : "0",
      numRoles: message.member
        ? message.member.roles.cache.size.toString()
        : "0",
      isDefaultMessage: message.type === MessageType.Default ? "0" : "1", // "0" ordinary text, "1" system, sticker or forwarded message
    };

    const redisClient = getRedisClient();
    try {
      await redisClient.xAdd("messageStream", "*", messageEntry, {
        // trim to prevent redis memory increasing infinitely
        TRIM: {
          strategy: "MAXLEN",
          strategyModifier: "~",
          threshold: 500_000,
        },
      });
      console.log("Message added to Redis stream");
    } catch (err) {
      console.error("Failed to add message to Redis stream:", err);
    }
  });
}

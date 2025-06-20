import { getDiscordClient } from "../clients/discord";
import { GuildTextBasedChannel } from "discord.js";
import { getModChannelID } from "../utils/modChannel";

const MOD_CHANNEL_ID = process.env.MOD_CHANNEL_ID ?? "";

export async function handleVerdict(
  data: Record<string, string>
): Promise<void> {
  const verdict = Number(data.verdict ?? 0);
  if (verdict === 0) return;

  const client = getDiscordClient();
  const channel = (await client.channels.fetch(
    data.channelID
  )) as GuildTextBasedChannel;

  switch (verdict) {
    case 1: {
      try {
        await channel.messages.delete(data.messageID);
        console.log("Deleted:", data.message, "(prob: ", data.probability, ")");
      } catch (e) {
        console.error("Delete failed:", e);
      }
      break;
    }
    case 2: {
      const modID = await getModChannelID(data.guildID);
      if (!modID) {
        console.warn("No mod channel set for guild", data.guildID);
        return;
      }
      const modChannel = (await client.channels.fetch(
        modID
      )) as GuildTextBasedChannel;
      await modChannel.send(
        `⚠️ Possible issue in <#${data.channelID}> ` +
          `https://discord.com/channels/${data.guildID}/${data.channelID}/${data.messageID}\n` +
          `Message: ${data.message}\nProb: ${data.probability}`
      );
      break;
    }
    default:
      console.warn("Unknown verdict:", verdict);
  }
}

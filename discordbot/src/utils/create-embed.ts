import { EmbedBuilder } from "discord.js";

export function buildHelpEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("Bot Help")
    .setDescription("Here are the available commands")
    .addFields(
      { name: "/help",          value: "Show this help message" },
      { name: "/setmodchannel", value: "Save the current channel for moderation alerts (administrator only)" },
    );
}

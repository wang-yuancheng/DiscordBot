import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { buildHelpEmbed } from "../utils/create-embed";

const command = new SlashCommandBuilder()
  .setName("help")
  .setDescription("List the bot commands and how to use them");

async function execute(inter: ChatInputCommandInteraction) {
  await inter.reply({
    embeds: [buildHelpEmbed()],
    flags: MessageFlags.Ephemeral,
  });
}

export { command as helpCommand, execute as helpExecute };

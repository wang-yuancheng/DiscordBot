import { SlashCommandBuilder } from "discord.js";
import { setModChannelCommand } from "./setModChannel";

const commands: SlashCommandBuilder[] = [
  setModChannelCommand, // add more commands here
];

export default commands.map((c) => c.toJSON());

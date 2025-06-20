import { SlashCommandBuilder } from "discord.js";
import { setModChannelCommand } from "./setModChannel";
import { helpCommand } from "./help"; 

const commands: SlashCommandBuilder[] = [
  setModChannelCommand,
  helpCommand,
];

export default commands.map((c) => c.toJSON());

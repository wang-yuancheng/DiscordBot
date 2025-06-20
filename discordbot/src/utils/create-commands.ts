import { SlashCommandBuilder } from "discord.js";
import { setModChannelCommand } from "../commands/set-mod-channel";
import { helpCommand } from "../commands/help";

const commands: SlashCommandBuilder[] = [setModChannelCommand, helpCommand];

export default commands.map((c) => c.toJSON());

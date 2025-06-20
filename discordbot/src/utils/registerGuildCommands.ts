import { REST, Routes, Guild } from "discord.js";
import commands from "../commands/commands";
import { getDiscordClient } from "../clients/discord";

const restClient = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN!);

export async function registerCommandsInGuild(guild: Guild): Promise<void> {
  const discordClient = getDiscordClient();
  const appId = discordClient.application!.id; 
  await restClient.put(Routes.applicationGuildCommands(appId, guild.id), {
    body: commands,
  });
  console.log(`✅ Slash commands registered in ${guild.name} (${guild.id})`);
}

import { MessageFlags } from "discord.js";
import { getDiscordClient } from "../clients/discord";
import { setModChannelExecute } from "../commands/setModChannel";

export function startInteractionListener(): void {
  const client = getDiscordClient();

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      switch (interaction.commandName) {
        case "setmodchannel":
          await setModChannelExecute(interaction);
          break;
        default:
          await interaction.reply({
            content: "Unknown command",
            flags: MessageFlags.Ephemeral,
          });
      }
    } catch (err) {
      console.error(err);
      if (!interaction.replied) {
        await interaction.reply({
          content: "⚠️ Error executing command",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });
}

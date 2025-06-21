import { Client, GatewayIntentBits } from "discord.js";

let client: Client | null = null;

export async function connectDiscordClient(): Promise<void> {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  await client.login(process.env.BOT_TOKEN);

  await new Promise<void>((resolve) => {
    client!.once("ready", () => {
      console.log("Bot is online");
      resolve();
    });
  });
}

export function getDiscordClient(): Client {
  if (!client) {
    throw new Error("Client not initialized");
  }
  return client;
}

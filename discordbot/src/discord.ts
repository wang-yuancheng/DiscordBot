import { Client, GatewayIntentBits } from "discord.js";

let client: Client | null = null;

export function connectClient(): Client {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once("ready", () => {
    console.log("✅ Bot is online");
  });

  client.login(process.env.BOT_TOKEN);

  return client;
}

// Call getClient() everytime we need client
export function getClient(): Client {
  if (!client) {
    throw new Error("Client not initialized");
  }
  return client;
}

import { getDiscordClient } from "../discord";

export default function startMessageListener() {
  const client = getDiscordClient();
  client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    console.log(`[${message.author.tag}] ${message.content}`);
  });
}

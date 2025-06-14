import { getClient } from "../discord";

export default function messageCreate() {
  const client = getClient();
  client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    console.log(`[${message.author.tag}] ${message.content}`);
  });
}

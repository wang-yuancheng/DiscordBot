import * as dotenv from "dotenv";
import { connectClient } from "./discord";
import messageCreate from "./events/messageCreate";

dotenv.config();
const client = connectClient();
client.once("ready", () => {
  messageCreate();
});

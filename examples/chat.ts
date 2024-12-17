import { Agent } from "../src/agent";
import dotenv from "dotenv";

dotenv.config();

console.log(process.env.OPENAI_API_KEY);

const chatExample = new Agent({
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: "You are a helpful AI assistant.",
});

const result = await chatExample.run("Hello, how are you?");
console.log(result.data);

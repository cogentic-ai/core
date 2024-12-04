import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

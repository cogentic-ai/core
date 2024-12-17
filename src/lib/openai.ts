import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(apiKey?: string): OpenAI {
  if (!client) {
    if (!apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is required. Provide it directly or set OPENAI_API_KEY environment variable.");
    }
    
    client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }
  return client;
}

export function resetOpenAIClient(): void {
  client = null;
}

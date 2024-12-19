import OpenAI from "openai";

export function createOpenAIClient(baseURL?: string): OpenAI {
  return new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL
  });
}

// Default client with no custom baseURL
export const openai = createOpenAIClient();

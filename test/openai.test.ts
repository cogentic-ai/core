import { expect, test, describe, mock } from "bun:test";
import { Agent } from "../src/agent";
import { createOpenAIClient } from "../src/lib/openai";

describe("OpenAI Configuration", () => {
  test("should use default OpenAI client when no client provided", () => {
    const agent = new Agent({
      model: "gpt-4o-mini",
      systemPrompt: "You are a helpful assistant",
    });

    expect((agent as any).openaiClient.baseURL).toBe(
      "https://api.openai.com/v1"
    );
  });

  test("should use custom client when provided", () => {
    const customClient = createOpenAIClient("http://localhost:11434/v1");
    
    const agent = new Agent({
      model: "gpt-4o-mini",
      systemPrompt: "You are a helpful assistant",
      openaiClient: customClient,
    });

    expect((agent as any).openaiClient.baseURL).toBe(
      "http://localhost:11434/v1"
    );
  });
});

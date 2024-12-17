import { expect, test, describe, beforeEach } from "bun:test";
import { Agent } from "../src/agent";
import { MockOpenAI } from "../src/mocks/openai";
import { resetOpenAIClient } from "../src/lib/openai";

describe("Agent", () => {
  beforeEach(() => {
    // Clear all mock responses before each test
    MockOpenAI.getInstance().clearMocks();
    // Reset OpenAI client
    resetOpenAIClient();
  });

  test("should make a simple chat completion call using mock", async () => {
    const mockPrompt = "Hello, who are you?";
    const mockResponse = "Hello, I am an AI assistant.";
    
    // Set up mock response
    MockOpenAI.getInstance().setMockResponse(mockPrompt, mockResponse);
    
    const agent = new Agent({
      model: "mock",
      apiKey: "test-key"
    });

    const result = await agent.run(mockPrompt);
    expect(result).toBe(mockResponse);
  });

  test("should throw error when no mock response is found", async () => {
    const agent = new Agent({
      model: "mock",
      apiKey: "test-key"
    });

    await expect(agent.run("unknown prompt")).rejects.toThrow("No mock response found for prompt: unknown prompt");
  });
});

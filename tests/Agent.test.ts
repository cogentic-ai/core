import { expect, test, describe, beforeEach, mock, afterAll } from "bun:test";
import { Agent, AgentError } from "../src/Agent";
import OpenAI from "openai";
import { config } from "dotenv";

// Load environment variables for development
config();

// Store original env
const originalEnv = process.env.OPENAI_API_KEY;

const mockCreateCompletion = mock(async () =>
  Promise.resolve({
    choices: [{ message: { content: "Hello, I am an AI!" } }],
  })
);

// Mock OpenAI client
mock.module("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreateCompletion,
      },
    };
  },
}));

describe("Agent", () => {
  beforeEach(() => {
    // Reset env between tests
    process.env.OPENAI_API_KEY = undefined;
    mockCreateCompletion.mockClear();
  });

  afterAll(() => {
    // Restore original env
    process.env.OPENAI_API_KEY = originalEnv;
  });

  test("should create an agent with explicit API key", async () => {
    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    expect(agent).toBeDefined();
    expect(agent.model).toBe("openai:gpt-4-mini");
  });

  test("should create an agent with environment API key", async () => {
    process.env.OPENAI_API_KEY = "env-test-key";
    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
    });

    expect(agent).toBeDefined();
    expect(agent.model).toBe("openai:gpt-4-mini");
  });

  test("should throw error when no API key is provided", () => {
    expect(
      () =>
        new Agent({
          model: "openai:gpt-4-mini",
          temperature: 0.7,
        })
    ).toThrow(AgentError);
  });

  test("should send chat message and receive response", async () => {
    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    const response = await agent.chat("Hello!");
    expect(response).toBe("Hello, I am an AI!");
    expect(mockCreateCompletion).toHaveBeenCalledTimes(1);
  });

  test("should handle OpenAI API errors", async () => {
    mockCreateCompletion.mockImplementation(() =>
      Promise.reject(new Error("API Error"))
    );

    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    await expect(agent.chat("Hello!")).rejects.toThrow(AgentError);
  });
});

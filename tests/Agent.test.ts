import { expect, test, describe, beforeEach, mock } from "bun:test";
import { Agent, AgentError, Message } from "../src/Agent";
import OpenAI from "openai";

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

  test("should include system prompts in messages", async () => {
    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
      apiKey: "test-key",
      systemPrompt: "You are a helpful AI assistant",
    });

    const result = await agent.run("Hello!");
    const messages = agent.getLastRunMessages();
    
    expect(messages?.[0]).toEqual({
      role: "system",
      content: "You are a helpful AI assistant",
    });
  });

  test("should include message history in conversation", async () => {
    const history: Message[] = [
      { role: "user", content: "Previous message" },
      { role: "assistant", content: "Previous response" },
    ];

    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    const result = await agent.run("Hello!", { messageHistory: history });
    const messages = agent.getLastRunMessages();

    expect(messages?.length).toBe(3); // history (2) + new message (1)
    expect(messages?.[0]).toEqual(history[0]);
    expect(messages?.[1]).toEqual(history[1]);
  });

  test("should retry on failure", async () => {
    let attempts = 0;
    mockCreateCompletion.mockImplementation(() => {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(new Error("API Error"));
      }
      return Promise.resolve({
        choices: [{ message: { content: "Success after retry!" } }],
      });
    });

    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
      apiKey: "test-key",
      retries: 2,
    });

    const result = await agent.run("Hello!");
    expect(result.data).toBe("Success after retry!");
    expect(attempts).toBe(2);
  });

  test("should handle OpenAI API errors after retries exhausted", async () => {
    mockCreateCompletion.mockImplementation(() => 
      Promise.reject(new Error("API Error"))
    );

    const agent = new Agent({
      model: "openai:gpt-4-mini",
      temperature: 0.7,
      apiKey: "test-key",
      retries: 2,
    });

    await expect(agent.run("Hello!")).rejects.toThrow(AgentError);
  });
});

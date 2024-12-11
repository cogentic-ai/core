import { expect, test, describe, beforeEach, mock } from "bun:test";
import { Agent, AgentError, ModelRetry, Message, Tool } from "../src/Agent";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Store original env
const REAL_API_KEY = process.env.OPENAI_API_KEY;

// Create a base mock class that we'll extend
class BaseMockOpenAI {
  chat = {
    completions: {
      create: mock(() => Promise.resolve({})),
    },
  };
}

const mockCreateCompletion = mock(async () =>
  Promise.resolve({
    choices: [{ message: { content: "Hello, I am an AI!" } }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  })
);

const mockCreateStreamingCompletion = mock(async () =>
  Promise.resolve({
    [Symbol.asyncIterator]: async function* () {
      yield { choices: [{ delta: { content: "Hello" } }] };
      yield { choices: [{ delta: { content: ", " } }] };
      yield { choices: [{ delta: { content: "I am streaming!" } }] };
    },
  })
);

// Mock OpenAI client
mock.module("openai", () => ({
  default: class MockOpenAI extends BaseMockOpenAI {
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
    // process.env.OPENAI_API_KEY = undefined;
    mockCreateCompletion.mockClear();
    mockCreateStreamingCompletion.mockClear();
  });

  test("should create an agent with explicit API key", () => {
    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    expect(agent).toBeDefined();
    expect(agent.model).toBe("gpt-4o-mini");
  });

  test("should create an agent with environment API key", () => {
    process.env.OPENAI_API_KEY = "env-test-key";
    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
    });

    expect(agent).toBeDefined();
    expect(agent.model).toBe("gpt-4o-mini");
  });

  test("should throw error when no API key is provided", () => {
    process.env.OPENAI_API_KEY = undefined;
    expect(
      () =>
        new Agent({
          model: "gpt-4o-mini",
          temperature: 0.7,
        })
    ).toThrow(AgentError);
  });

  test("should include system prompts in messages", async () => {
    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
      systemPrompt: "You are a helpful AI assistant",
    });

    await agent.run("Hello!");
    const messages = agent.getLastRunMessages();

    expect(messages?.[0]).toEqual({
      role: "system",
      content: "You are a helpful AI assistant",
    });
  });

  test("should support dynamic system prompts", async () => {
    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    agent.addSystemPrompt(() => "Dynamic prompt");
    await agent.run("Hello!");
    const messages = agent.getLastRunMessages();

    expect(
      messages?.some(
        (m) => m.role === "system" && m.content === "Dynamic prompt"
      )
    ).toBe(true);
  });

  test("should include message history in conversation", async () => {
    const history: Message[] = [
      { role: "user", content: "Previous message" },
      { role: "assistant", content: "Previous response" },
    ];

    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    await agent.run("Hello!", { messageHistory: history });
    const messages = agent.getLastRunMessages();

    expect(messages?.length).toBe(3); // history (2) + new message (1)
    expect(messages?.[0]).toEqual(history[0]);
    expect(messages?.[1]).toEqual(history[1]);
  });

  test("should track costs", async () => {
    mockCreateCompletion.mockImplementationOnce(async () =>
      Promise.resolve({
        choices: [{ message: { content: "Hello, I am an AI!" } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      })
    );

    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    await agent.run("Hello!");
    const cost = agent.getCost();

    expect(cost.promptTokens).toBe(10);
    expect(cost.completionTokens).toBe(20);
    expect(cost.totalTokens).toBe(30);
    expect(cost.inputCost).toBeGreaterThan(0);
    expect(cost.outputCost).toBeGreaterThan(0);
    expect(cost.totalCost).toBeGreaterThan(0);
  });

  test("should handle tool calls", async () => {
    mockCreateCompletion.mockImplementationOnce(async () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: "call_1234",
                  type: "function",
                  function: {
                    name: "testTool",
                    arguments: JSON.stringify({ input: "test" }),
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      })
    );

    const testTool: Tool = {
      name: "testTool",
      description: "A test tool",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
      },
      func: async (args: any) => `Processed: ${args.input}`,
    };

    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
      tools: [testTool],
    });

    const result = await agent.run("Use the test tool");
    expect(result.data).toBe("Processed: test");
  });

  test("should validate results", async () => {
    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    agent.addResultValidator((result: string) => {
      if (result.includes("wrong")) {
        throw new ModelRetry("Invalid response");
      }
      return result.toUpperCase();
    });

    mockCreateCompletion.mockImplementationOnce(async () =>
      Promise.resolve({
        choices: [{ message: { content: "A correct response" } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      })
    );

    const result = await agent.run("Hello!");
    expect(result.data).toBe("A CORRECT RESPONSE");
  });

  test("should retry on validation failure", async () => {
    // Agent will retry once because the first response is invalid
    let attempts = 0;
    mockCreateCompletion.mockImplementation(async () => {
      attempts++;
      return Promise.resolve({
        choices: [
          {
            message: {
              content: attempts === 1 ? "wrong response" : "correct response",
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });
    });

    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
      retries: 3,
      resultRetries: 3,
    });

    agent.addResultValidator((result: string) => {
      if (result.includes("wrong")) {
        throw new ModelRetry("Invalid response");
      }
      return result;
    });

    const result = await agent.run("Hello!");
    expect(attempts).toBe(2); // Should try twice: first fails, second succeeds
    expect(result.data).toBe("correct response");
  });

  test("should support streaming responses", async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield {
          choices: [{ delta: { content: "Hello, I am an AI!" } }],
        };
      },
    };

    mockCreateCompletion.mockImplementationOnce(async () => mockStream);

    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: "test-key",
    });

    const chunks: string[] = [];
    for await (const chunk of agent.runStream("Hello")) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toBe("Hello, I am an AI!");
  });
});

import { expect, test, describe, beforeEach, mock } from "bun:test";
import { Agent, AgentError, ModelRetry, Message, Tool } from "../src/Agent";
import OpenAI from "openai";

// Store original env
const originalEnv = process.env.OPENAI_API_KEY;

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

  test("should create an agent with explicit API key", () => {
    const agent = new Agent({
      model: "gpt-4",
      temperature: 0.7,
      apiKey: "test-key",
    });

    expect(agent).toBeDefined();
    expect(agent.model).toBe("gpt-4");
  });

  test("should create an agent with environment API key", () => {
    process.env.OPENAI_API_KEY = "env-test-key";
    const agent = new Agent({
      model: "gpt-4",
      temperature: 0.7,
    });

    expect(agent).toBeDefined();
    expect(agent.model).toBe("gpt-4");
  });

  test("should throw error when no API key is provided", () => {
    expect(
      () =>
        new Agent({
          model: "gpt-4",
          temperature: 0.7,
        })
    ).toThrow(AgentError);
  });

  test("should include system prompts in messages", async () => {
    const agent = new Agent({
      model: "gpt-4",
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
      model: "gpt-4",
      temperature: 0.7,
      apiKey: "test-key",
    });

    agent.addSystemPrompt(() => "Dynamic prompt");
    await agent.run("Hello!");
    const messages = agent.getLastRunMessages();

    expect(messages?.some(m => 
      m.role === "system" && m.content === "Dynamic prompt"
    )).toBe(true);
  });

  test("should include message history in conversation", async () => {
    const history: Message[] = [
      { role: "user", content: "Previous message" },
      { role: "assistant", content: "Previous response" },
    ];

    const agent = new Agent({
      model: "gpt-4",
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
    const agent = new Agent({
      model: "gpt-4",
      temperature: 0.7,
      apiKey: "test-key",
    });

    await agent.run("Hello!");
    const cost = agent.getCost();

    expect(cost.promptTokens).toBe(10);
    expect(cost.completionTokens).toBe(20);
    expect(cost.totalTokens).toBe(30);
    expect(cost.estimatedCost).toBeGreaterThan(0);
  });

  test("should handle tool calls", async () => {
    mockCreateCompletion.mockImplementation(async () =>
      Promise.resolve({
        choices: [
          {
            message: {
              function_call: {
                name: "testTool",
                arguments: JSON.stringify({ input: "test" }),
              },
            },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
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
      model: "gpt-4",
      temperature: 0.7,
      apiKey: "test-key",
      tools: [testTool],
    });

    const result = await agent.run("Use the test tool");
    expect(result.data).toBe("Processed: test");
  });

  test("should validate results", async () => {
    const agent = new Agent({
      model: "gpt-4",
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
      model: "gpt-4",
      temperature: 0.7,
      apiKey: "test-key",
      retries: 2,
    });

    agent.addResultValidator((result: string) => {
      if (result.includes("wrong")) {
        throw new ModelRetry("Invalid response");
      }
      return result;
    });

    const result = await agent.run("Hello!");
    expect(result.data).toBe("correct response");
    expect(attempts).toBe(2);
  });

  test("should support streaming responses", async () => {
    const MockOpenAIWithStream = class extends MockOpenAI {
      chat = {
        completions: {
          create: mockCreateStreamingCompletion,
        },
      };
    };

    // Override the mock for this test
    mock.module("openai", () => ({
      default: MockOpenAIWithStream,
    }));

    const agent = new Agent({
      model: "gpt-4",
      temperature: 0.7,
      apiKey: "test-key",
    });

    const chunks: string[] = [];
    for await (const chunk of agent.runStream("Hello!")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", ", ", "I am streaming!"]);
  });
});

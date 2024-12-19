import { expect, test, describe, mock } from "bun:test";
import { Agent } from "../src/agent";
import { z } from "zod";
import type OpenAI from "openai";

// Mock OpenAI client
const createMock = mock(() => Promise.resolve({}));

const mockOpenAIClient = {
  chat: {
    completions: {
      create: createMock,
    },
  },
} as unknown as OpenAI;

describe("Agent", () => {
  describe("Basic Interaction", () => {
    test("should generate a text response", async () => {
      createMock.mockImplementation(() =>
        Promise.resolve({
          choices: [{ message: { content: "Hello, World!" } }],
        })
      );

      const agent = new Agent({
        model: "gpt-4o-mini",
        openaiClient: mockOpenAIClient,
        systemPrompt: "You are a helpful assistant",
      });

      const response = await agent.run("Say Hello");
      expect(response).toBe("Hello, World!");
    });

    test("should handle errors gracefully", async () => {
      createMock.mockImplementation(() =>
        Promise.reject(new Error("Mock error"))
      );

      const agent = new Agent({
        model: "gpt-4o-mini",
        openaiClient: mockOpenAIClient,
        systemPrompt: "You are a helpful assistant",
      });

      await expect(agent.run("Say Hello")).rejects.toThrow("Mock error");
    });

    test("should include system prompt in response generation", async () => {
      const expectedResponse = "I am a helpful assistant saying Hello!";
      createMock.mockImplementation(() =>
        Promise.resolve({
          choices: [{ message: { content: expectedResponse } }],
        })
      );

      const agent = new Agent({
        model: "gpt-4o-mini",
        openaiClient: mockOpenAIClient,
        systemPrompt: "You are a helpful assistant",
      });

      const response = await agent.run("Say Hello");
      expect(response).toBe(expectedResponse);
    });
  });

  describe("JSON Output", () => {
    test("should return typed JSON response when schema is provided", async () => {
      const jsonResponse = { name: "John", age: 30 };
      createMock.mockImplementation(() =>
        Promise.resolve({
          choices: [{ message: { content: JSON.stringify(jsonResponse) } }],
        })
      );

      const UserSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const agent = new Agent({
        model: "gpt-4o-mini",
        systemPrompt: "You are a helpful AI assistant.",
        openaiClient: mockOpenAIClient,
        responseType: UserSchema,
      });

      const response = await agent.run("Get user info");
      expect(response).toEqual(jsonResponse);
      expect(UserSchema.parse(response)).toBeDefined();
    });

    test("should return raw text when no schema is provided", async () => {
      const mockResponse = "Hello, World!";

      createMock.mockImplementation(() =>
        Promise.resolve({
          choices: [{ message: { content: mockResponse } }],
        })
      );

      const agent = new Agent({
        model: "gpt-4o-mini",
        systemPrompt: "You are a helpful AI assistant.",
        openaiClient: mockOpenAIClient,
      });

      const response = await agent.run("Say Hello");
      expect(response).toBe(mockResponse);
      expect(typeof response).toBe("string");
    });
  });

  describe("Memory Management", () => {
    test("should maintain conversation history", async () => {
      const mockResponse1 = "Hello! How can I help you today?";
      const mockResponse2 = "In our previous conversation, you said 'Hello'";

      const mockOpenAIClient = {
        chat: {
          completions: {
            create: mock((params) => {
              const response = params.messages[
                params.messages.length - 1
              ].content.includes("last time")
                ? mockResponse2
                : mockResponse1;

              return Promise.resolve({
                choices: [{ message: { content: response } }],
              });
            }),
          },
        },
      };

      const agent = new Agent({
        model: "gpt-4o-mini",
        systemPrompt: "You are a helpful AI assistant.",
        openaiClient: mockOpenAIClient,
      });

      const messages = [{ role: "user", content: "Hello!" }];

      const response1 = await agent.run("Hello!", { messages });
      expect(response1).toBe(mockResponse1);

      messages.push(
        { role: "assistant", content: mockResponse1 },
        { role: "user", content: "What did you say last time?" }
      );

      const response2 = await agent.run("What did you say last time?", {
        messages,
      });
      expect(response2).toBe(mockResponse2);
    });
  });
});

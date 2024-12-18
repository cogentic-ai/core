import { expect, test, describe, mock } from "bun:test";
import { Agent } from "../src/agent";
import { z } from "zod";
import type OpenAI from "openai";

const createMock = mock(() => Promise.resolve({}));

const mockOpenAIClient = {
  chat: {
    completions: {
      create: createMock,
    },
  },
} as unknown as OpenAI;

describe("Agent JSON Response", () => {
  test("should return typed JSON response when schema is provided", async () => {
    // Define a sample response schema
    const PersonSchema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email(),
    });

    const mockResponse = {
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    };

    createMock.mockImplementation(() =>
      Promise.resolve({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }],
      })
    );

    const agent = new Agent({
      model: "gpt-4o-mini",
      openaiClient: mockOpenAIClient,
      responseType: PersonSchema,
      systemPrompt: "You are a helpful AI assistant.",
    });

    const response = await agent.run("Get person info");

    // Test the behavior - we get back a properly typed response
    expect(response).toEqual(mockResponse);
    expect(PersonSchema.parse(response)).toBeDefined();
  });

  test("should throw error when response doesn't match schema", async () => {
    const PersonSchema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email(),
    });

    const invalidResponse = {
      name: "John Doe",
      age: "30", // This should be a number
      email: "invalid-email", // This should be a valid email
    };

    createMock.mockImplementation(() =>
      Promise.resolve({
        choices: [{ message: { content: JSON.stringify(invalidResponse) } }],
      })
    );

    const agent = new Agent({
      model: "gpt-4o-mini",
      openaiClient: mockOpenAIClient,
      responseType: PersonSchema,
      systemPrompt: "You are a helpful AI assistant.",
    });

    await expect(agent.run("Get person info")).rejects.toThrow();
  });
});

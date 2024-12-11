import { expect, test, describe, beforeEach, mock } from "bun:test";
import { Agent, AgentError } from "../src/Agent";
import { z } from "zod";
import { Schema } from "../src/validation";

// Create mock OpenAI client
const mockCreateCompletion = mock(() => Promise.resolve({}));

// Mock the entire OpenAI module
mock.module("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreateCompletion,
      },
    };
  },
}));

describe("Agent Schema Validation", () => {
  // Example schemas we'll use in tests
  const CitySchema = z.object({
    city: z.string(),
    country: z.string(),
    population: z.number().optional(),
  });

  const ProfileSchema = z.object({
    name: z.string(),
    age: z.number(),
  });

  // Reset mocks before each test
  beforeEach(() => {
    mockCreateCompletion.mockClear();
  });

  test("should validate successful structured response", async () => {
    const validResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              city: "London",
              country: "United Kingdom",
              population: 8900000,
            }),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    mockCreateCompletion.mockImplementationOnce(() => Promise.resolve(validResponse));

    const agent = new Agent({
      model: "gpt-4o-mini",
      apiKey: "test-key",
      resultType: CitySchema,
    });

    const result = await agent.run("Tell me about London");
    expect(result.data.city).toBe("London");
    expect(result.data.country).toBe("United Kingdom");
    expect(result.data.population).toBe(8900000);
  });

  test("should reject invalid structured response", async () => {
    const invalidResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              city: "London",
              // missing required country field
              population: 8900000,
            }),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    mockCreateCompletion.mockImplementationOnce(() => Promise.resolve(invalidResponse));

    const agent = new Agent({
      model: "gpt-4o-mini",
      apiKey: "test-key",
      resultType: CitySchema,
    });

    await expect(agent.run("Tell me about London")).rejects.toThrow("Validation failed");
  });

  test("should handle text or structured response", async () => {
    const textResponse = {
      choices: [
        {
          message: {
            content: "London is a city in England.",
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    const structuredResponse = {
      choices: [
        {
          message: {
            content: {
              city: "London",
              country: "UK",
              population: 8900000,
            },
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    mockCreateCompletion.mockImplementationOnce(() => Promise.resolve(textResponse));
    mockCreateCompletion.mockImplementationOnce(() => Promise.resolve(structuredResponse));

    const agent = new Agent({
      model: "gpt-4o-mini",
      apiKey: "test-key",
      resultType: z.union([z.string(), CitySchema]),
    });

    const result1 = await agent.run("Tell me about London");
    expect(typeof result1.data).toBe("string");
    expect(result1.data).toBe("London is a city in England.");

    const result2 = await agent.run("Tell me about London structured");
    expect(result2.data).toEqual({
      city: "London",
      country: "UK",
      population: 8900000,
    });
  });

  test("should handle multiple possible response types", async () => {
    const agent = new Agent({
      model: "gpt-4o-mini",
      apiKey: "test-key",
      resultType: Schema.union(CitySchema, ProfileSchema),
    });

    // Test with city response
    const cityResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              city: "London",
              country: "United Kingdom",
            }),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    mockCreateCompletion.mockImplementationOnce(() => Promise.resolve(cityResponse));
    const result1 = await agent.run("Tell me about London");
    expect(result1.data.city).toBe("London");

    // Test with profile response
    const profileResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: "John",
              age: 30,
            }),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    mockCreateCompletion.mockImplementationOnce(() => Promise.resolve(profileResponse));
    const result2 = await agent.run("Tell me about John");
    expect(result2.data.name).toBe("John");
  });

  test("should handle malformed JSON responses", async () => {
    const malformedResponse = {
      choices: [
        {
          message: {
            content: "{ city: London, country: UK }", // Invalid JSON
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    };

    mockCreateCompletion.mockImplementationOnce(() => Promise.resolve(malformedResponse));

    const agent = new Agent({
      model: "gpt-4o-mini",
      apiKey: "test-key",
      resultType: CitySchema,
    });

    await expect(agent.run("Tell me about London")).rejects.toThrow("Failed to parse");
  });
});

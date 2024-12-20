import { expect, test, describe } from "bun:test";
import { Agent } from "../src/agent";
import { createOpenAIClient } from "../src/lib/openai";

describe("Tool Calling", () => {
  test("should execute a simple tool", async () => {
    const mockTool = {
      name: "calculator",
      description: "A simple calculator that can add two numbers",
      function: (a: number, b: number) => a + b,
      parameters: {
        type: "object",
        properties: {
          a: { type: "number", description: "First number" },
          b: { type: "number", description: "Second number" }
        },
        required: ["a", "b"]
      }
    };

    const mockResponse = {
      tool_calls: [{
        type: "function",
        function: {
          name: "calculator",
          arguments: JSON.stringify({ a: 5, b: 3 })
        }
      }]
    };

    const agent = new Agent({
      model: "mock",
      systemPrompt: "You are a helpful assistant with access to tools",
      mockData: JSON.stringify(mockResponse),
      tools: [mockTool]
    });

    const result = await agent.run("What is 5 + 3?");
    expect(result).toBe(8);
  });
});

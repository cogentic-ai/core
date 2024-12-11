import { expect, test, describe, beforeEach } from "bun:test";
import { Agent, AgentConfig } from "../src/Agent";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe("Agent Integration Tests", () => {
  beforeEach(() => {
    // Set up the global API key
    AgentConfig.getInstance().setApiKey(OPENAI_API_KEY);
  });

  test("integration: should work with real OpenAI API and tool calls", async () => {
    if (!OPENAI_API_KEY) {
      console.log("Skipping OpenAI API test - no API key provided");
      return;
    }

    const testTool: Tool = {
      name: "echo",
      description: "Echo the input back",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
      },
      func: async (args: any) => `Echo: ${args.input}`,
    };

    const agent = new Agent({
      model: "gpt-4o-mini",
      tools: [testTool],
    });

    try {
      const result = await agent.run(
        "Use the echo tool with the input 'hello world'"
      );

      console.log(result.cost);

      expect(result.data).toContain("Echo: hello world");
      expect(typeof result.cost).toBe("number");
    } catch (error: any) {
      if (error.message.includes("API key")) {
        console.log("Skipping OpenAI API test - invalid API key");
        return;
      }
      throw error;
    }
  });

  test("integration: should retry tool calls until success", async () => {
    if (!OPENAI_API_KEY) {
      console.log("Skipping OpenAI API test - no API key provided");
      return;
    }

    let attempts = 0;
    const calculatorTool: Tool = {
      name: "calculator",
      description: "Calculate a mathematical expression. Returns a number.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string" },
        },
        required: ["expression"],
      },
      func: async (args: any) => {
        attempts++;
        // First attempt: return invalid result
        if (attempts === 1) {
          return "Error: Invalid expression";
        }
        // Second attempt: return wrong result
        if (attempts === 2) {
          return "42";
        }
        // Third attempt: return correct result
        return "4";
      },
    };

    const agent = new Agent({
      model: "gpt-4o-mini",
      tools: [calculatorTool],
      retries: 3,
      resultRetries: 3,
    });

    agent.addResultValidator((result: string) => {
      // Validate that the result contains a number that equals 4
      const match = result.match(/(\d+)/);
      if (!match || parseInt(match[1]) !== 4) {
        throw new ModelRetry("Result must be 4");
      }
      return result;
    });

    try {
      const result = await agent.run(
        "Use the calculator tool to compute 2 + 2"
      );

      console.log("Attempts:", attempts);
      console.log("Result:", result.data);
      console.log("Cost:", result.cost);

      expect(attempts).toBe(3); // Should have tried 3 times
      expect(result.data).toContain("4"); // Final result should be 4
      expect(typeof result.cost).toBe("number");
    } catch (error: any) {
      if (error.message.includes("API key")) {
        console.log("Skipping OpenAI API test - invalid API key");
        return;
      }
      throw error;
    }
  }, 10000); // Increased timeout for API call
});

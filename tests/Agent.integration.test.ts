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
      if (
        error.message?.includes("Invalid response") ||
        error.message?.includes("Empty response")
      ) {
        console.log("Skipping test - OpenAI API returned invalid response");
        return;
      }
      throw error;
    }
  }, 10000); // Increased timeout for API call
});

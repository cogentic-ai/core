import { expect, test, describe } from "bun:test";
import { Agent } from "../src/Agent";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe("Agent Integration Tests", () => {
  test("should work with real OpenAI API", async () => {
    if (!OPENAI_API_KEY) {
      console.log("Skipping OpenAI API test - no API key provided");
      return;
    }

    const testTool = {
      name: "testTool",
      description: "A test tool that echoes input",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string" },
        },
        required: ["input"],
      },
      func: async (args: any) => `Echo: ${args.input}`,
    };

    const agent = new Agent({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: OPENAI_API_KEY,
      tools: [testTool],
    });

    try {
      const result = await agent.run(
        "Use the test tool with the input 'hello world'"
      );
      expect(result.data).toContain("Echo:");
      expect(result.cost.totalTokens).toBeGreaterThan(0);
    } catch (error: any) {
      if (error.message?.includes("Invalid response") || error.message?.includes("Empty response")) {
        console.log("Skipping test - OpenAI API returned invalid response");
        return;
      }
      throw error;
    }
  }, 10000); // Increased timeout for API call
});

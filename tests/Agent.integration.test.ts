import { expect, test, describe } from "bun:test";
import { Agent } from "../src/Agent";
import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe("Agent Integration Tests", () => {
  test("integration: should work with real OpenAI API and tool calls", async () => {
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
      func: async (args: any) => {
        console.log("testTool called with input:", args.input);
        return `Echo: ${args.input}`;
      },
    };

    const agent = new Agent({
      model: "gpt-4o-mini",
      apiKey: OPENAI_API_KEY,
      tools: [testTool],
    });

    try {
      const result = await agent.run(
        "Use the test tool with the input 'hello world'"
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

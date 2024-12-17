import { expect, test, describe, beforeEach } from "bun:test";
import { Agent } from "../../src/agent";
import { resetOpenAIClient } from "../../src/lib/openai";
import dotenv from "dotenv";
dotenv.config();

describe("Agent Integration", () => {
  // Skip this test by default since it requires an API key
  // Run with: bun test --timeout 10000 test/integration
  beforeEach(() => {
    // Reset OpenAI client before each test
    resetOpenAIClient();
  });

  test(
    "should make a real chat completion call",
    async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test: OPENAI_API_KEY not set");
        return;
      }

      const agent = new Agent({
        model: "gpt-4o-mini",
        apiKey,
      });

      const prompt = "Say 'Hello, World!' in a creative way.";
      const response = await agent.run(prompt);

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
      // Log the actual response for manual verification
      console.log("AI Response:", response);
    },
    { timeout: 10000 }
  ); // Increase timeout for API call
});

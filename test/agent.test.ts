import { expect, test, describe } from "bun:test";
import { Agent } from "../src/agent";

describe("Agent", () => {
  test("should make a simple chat completion call", async () => {
    const agent = new Agent({
      model: "gpt-4",
      apiKey: "test-key"
    });

    const mockResponse = {
      choices: [{
        message: {
          content: "Hello, I am an AI assistant."
        }
      }]
    };

    // Mock the fetch function
    global.fetch = async () => {
      return {
        ok: true,
        json: async () => mockResponse
      } as Response;
    };

    const result = await agent.run("Hello, who are you?");
    expect(result).toBe("Hello, I am an AI assistant.");
  });
});

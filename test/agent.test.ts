import { expect, test, describe } from "bun:test";
import { Agent } from "../src/agent";

describe("Agent", () => {
  describe("Basic Interaction", () => {
    test("should generate a creative hello world response", async () => {
      const mockResponse = "🌟 Greetings, magnificent Earth! A digital wave of salutations to you! 🌍";
      const agent = new Agent({
        model: "mock",
        mockData: mockResponse
      });

      const response = await agent.run("Say 'Hello, World!' in a creative way.");

      expect(response).toBe(mockResponse);
    });

    test("should handle errors gracefully", async () => {
      const agent = new Agent({
        model: "non-existent-model",
      });

      await expect(agent.run("Hello")).rejects.toThrow();
    });
  });

  describe("JSON Output", () => {
    test("should return structured JSON output when json option is enabled", async () => {
      const mockResponse = "Hello, World!";
      
      const agent = new Agent({
        model: "mock",
        mockData: mockResponse,
        json: true
      });

      const response = await agent.run("Say Hello");
      const parsedResponse = JSON.parse(response);
      
      expect(parsedResponse).toEqual({
        content: "Hello, World!",
        metadata: {
          model: "mock",
          timestamp: expect.any(String)
        }
      });
    });
  });
});

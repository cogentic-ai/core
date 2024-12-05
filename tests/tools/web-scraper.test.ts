import { expect, test, describe } from "bun:test";
import { webScraperTool } from "../../src/tools/web-scraper.tool";

describe("Web Scraper Tool", () => {
  const mockServer = {
    html: "https://example.com",
    json: "https://jsonplaceholder.typicode.com/posts/1",
    error: "https://httpstat.us/500"
  };

  test("should successfully scrape HTML content", async () => {
    const result = await webScraperTool.execute(
      { deps: {} },
      { url: mockServer.html }
    );

    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.url).toBe(mockServer.html);
  });

  test("should handle JSON responses", async () => {
    const result = await webScraperTool.execute(
      { deps: {} },
      { url: mockServer.json }
    );

    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.metadata.statusCode).toBe(200);
  });

  test("should handle server errors", async () => {
    try {
      await webScraperTool.execute(
        { deps: {} },
        { url: mockServer.error }
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toContain("500");
    }
  });

  test("should handle invalid URLs", async () => {
    try {
      await webScraperTool.execute(
        { deps: {} },
        { url: "http://invalid-url-that-does-not-exist.com" }
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error instanceof Error).toBe(true);
    }
  });

  test("should validate input URL", () => {
    expect(() => 
      webScraperTool.schema.input.parse({ url: "not-a-url" })
    ).toThrow();

    expect(() =>
      webScraperTool.schema.input.parse({ url: "https://example.com" })
    ).not.toThrow();
  });

  test("should validate output schema", () => {
    const validOutput = {
      success: true,
      content: "test content",
      metadata: {
        url: "https://example.com",
        timestamp: new Date().toISOString(),
        statusCode: 200
      }
    };

    expect(() =>
      webScraperTool.schema.output.parse(validOutput)
    ).not.toThrow();

    const invalidOutput = {
      success: true,
      content: 123, // Should be string
      metadata: {
        url: "https://example.com",
        timestamp: new Date().toISOString(),
        statusCode: 200
      }
    };

    expect(() =>
      webScraperTool.schema.output.parse(invalidOutput)
    ).toThrow();
  });
});

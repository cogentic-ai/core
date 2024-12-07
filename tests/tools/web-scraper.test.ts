import { expect, test, describe } from "bun:test";
import { webScraper } from "../../src/tools/web-scraper.tool";

describe("Web Scraper", () => {
  test("should successfully fetch web content", async () => {
    const content = await webScraper.implementation("example.com");
    expect(content).toBeDefined();
    expect(typeof content).toBe("string");
  });

  test("should handle fetch errors", async () => {
    try {
      await webScraper.implementation("invalid-url-that-does-not-exist");
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error instanceof Error).toBe(true);
    }
  });

  test("should have valid OpenAI function definition", () => {
    const def = webScraper.definition;
    expect(def.type).toBe("function");
    expect(def.function.name).toBe("fetch_web_page");
    expect(def.function.parameters.type).toBe("object");
    expect(def.function.parameters.properties.url.type).toBe("string");
    expect(def.function.parameters.required).toContain("url");
  });
});

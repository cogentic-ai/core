import { expect, test, describe } from "bun:test";
import { imageAnalyzerTool } from "../../src/tools/image-analyzer.tool";
import { readFileSync } from "fs";
import { join } from "path";

describe("Image Analyzer Tool", () => {
  // Read the test image
  const imagePath = join(
    __dirname,
    "../assets/Tales_of_Suspense_Vol_1_49.webp"
  );
  const testImage = readFileSync(imagePath).toString("base64");

  test("should analyze comic book cover", async () => {
    const result = await imageAnalyzerTool.execute(
      { deps: { openaiKey: process.env.OPENAI_API_KEY } },
      {
        base64Image: testImage,
        prompt:
          "This is a comic book cover. Describe the title, characters, and key visual elements. What issue number is it?",
      }
    );

    expect(result.success).toBe(true);
    expect(result.description).toBeDefined();
    expect(result.description.toLowerCase()).toContain("iron man");
    expect(result.tags).toBeDefined();
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.tags.length).toBeGreaterThan(0);
    expect(Array.isArray(result.objects)).toBe(true);
    expect(Array.isArray(result.colors)).toBe(true);
    expect(result.metadata.confidence).toBeGreaterThanOrEqual(0);
    expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    expect(result.metadata.model).toBe("gpt-4o-mini");
    expect(result.metadata.processingTime).toBeGreaterThan(0);

    console.log("Analysis Result:", JSON.stringify(result, null, 2));
  }, 15000); // 15 second timeout for larger image

  test("should handle specific visual queries", async () => {
    const result = await imageAnalyzerTool.execute(
      { deps: { openaiKey: process.env.OPENAI_API_KEY } },
      {
        base64Image: testImage,
        prompt:
          "What colors are predominantly used in this comic cover? List them in order of prominence.",
      }
    );

    expect(result.success).toBe(true);
    expect(result.description).toBeDefined();
    expect(result.colors.length).toBeGreaterThan(0);
  }, 15000);

  test("should validate input schema", () => {
    expect(() =>
      imageAnalyzerTool.schema.input.parse({
        base64Image: 123, // Should be string
      })
    ).toThrow();

    expect(() =>
      imageAnalyzerTool.schema.input.parse({
        base64Image: testImage,
        prompt: "Analyze this",
      })
    ).not.toThrow();
  });

  test("should validate output schema", () => {
    const validOutput = {
      success: true,
      description: "Tales of Suspense #49 featuring Iron Man",
      tags: ["comic", "superhero", "Iron Man", "action"],
      objects: ["armor", "robot", "machinery"],
      colors: ["red", "gold", "blue"],
      metadata: {
        confidence: 0.95,
        model: "gpt-4o-mini",
        processingTime: 1234,
      },
    };

    expect(() =>
      imageAnalyzerTool.schema.output.parse(validOutput)
    ).not.toThrow();

    const invalidOutput = {
      success: true,
      description: 123, // Should be string
      tags: ["comic"],
      objects: ["armor"],
      colors: ["red"],
      metadata: {
        confidence: 0.95,
        model: "gpt-4o-mini",
        processingTime: 1234,
      },
    };

    expect(() =>
      imageAnalyzerTool.schema.output.parse(invalidOutput)
    ).toThrow();
  });

  test("should handle invalid base64", async () => {
    try {
      await imageAnalyzerTool.execute(
        { deps: { openaiKey: process.env.OPENAI_API_KEY } },
        { prompt: "Analyze this", base64Image: "not-base64" }
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error instanceof Error).toBe(true);
    }
  }, 10000);
});

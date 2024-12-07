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

  test("should analyze comic book cover details", async () => {
    const result = await imageAnalyzerTool.execute(
      { deps: { openaiKey: process.env.OPENAI_API_KEY } },
      {
        base64Image: testImage,
        prompt:
          "Return the title, issue number, and publisher of this comic book. Format the response as a JSON object with fields: title (string), issueNumber (number), and publisher (string).",
      }
    );

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result.title.toLowerCase()).toContain("tales of suspense");
    expect(result.result.issueNumber).toBe(49);
    expect(result.result.publisher).toBeDefined();
    expect(result.metadata.model).toBe("gpt-4o-mini");
    expect(result.metadata.processingTime).toBeGreaterThan(0);

    console.log("🎨 Vision magic...\n", JSON.stringify(result, null, 2));
  }, 15000);

  test("should analyze character costumes", async () => {
    const result = await imageAnalyzerTool.execute(
      { deps: { openaiKey: process.env.OPENAI_API_KEY } },
      {
        base64Image: testImage,
        prompt:
          "Analyze the costumes in this comic. Format the response as a JSON object with fields: costumes (array of costume descriptions), colors (array of color names), and materials (array of material names).",
      }
    );

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.costumes)).toBe(true);
    expect(Array.isArray(result.result.colors)).toBe(true);
    expect(Array.isArray(result.result.materials)).toBe(true);
    expect(
      result.result.colors.some((color: string) =>
        color.toLowerCase().includes("red")
      )
    ).toBe(true);
  }, 15000);

  test("should analyze scene composition", async () => {
    const result = await imageAnalyzerTool.execute(
      { deps: { openaiKey: process.env.OPENAI_API_KEY } },
      {
        base64Image: testImage,
        prompt:
          "Analyze the layout and composition of this comic cover. Format the response as a JSON object with fields: mainElements (array of key visual elements), composition (object describing the layout), and focusPoint (string describing the main focus).",
      }
    );

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.mainElements)).toBe(true);
    expect(typeof result.result.composition).toBe("object");
    expect(typeof result.result.focusPoint).toBe("string");
  }, 15000);

  test("should validate input schema", () => {
    expect(() =>
      imageAnalyzerTool.schema.input.parse({
        base64Image: 123, // Should be string
      } as any)
    ).toThrow();

    expect(() =>
      imageAnalyzerTool.schema.input.parse({
        base64Image: testImage,
        prompt: "Tell me about this comic.",
      })
    ).not.toThrow();
  });

  test("should validate output schema", () => {
    const validOutput = {
      success: true,
      result: {
        title: "Tales of Suspense",
        issueNumber: 49,
        description: "Iron Man in action",
      },
      metadata: {
        model: "gpt-4o-mini",
        processingTime: 1234,
      },
    };

    expect(() =>
      imageAnalyzerTool.schema.output.parse(validOutput)
    ).not.toThrow();

    const invalidOutput = {
      success: "true", // Should be boolean
      result: {},
      metadata: {
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
        {
          base64Image: "not-base64",
          prompt: "What's in this image?",
        }
      );
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error instanceof Error).toBe(true);
    }
  }, 10000);
});

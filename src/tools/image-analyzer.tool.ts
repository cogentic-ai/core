import { z } from "zod";
import { Tool } from "../lib/agent";
import { openai } from "../lib/openai";

const imageAnalyzerInputSchema = z.object({
  base64Image: z.string(),
  prompt: z.string().optional().default("What is in this image?"),
});

const imageAnalyzerOutputSchema = z.object({
  success: z.boolean(),
  description: z.string(),
  tags: z.array(z.string()),
  objects: z.array(z.string()),
  colors: z.array(z.string()),
  metadata: z.object({
    confidence: z.number(),
    model: z.string(),
    processingTime: z.number(),
  }),
});

type ImageAnalyzerInput = z.infer<typeof imageAnalyzerInputSchema>;
type ImageAnalyzerOutput = z.infer<typeof imageAnalyzerOutputSchema>;

export const imageAnalyzerTool: Tool<ImageAnalyzerInput, ImageAnalyzerOutput> =
  {
    name: "image_analyzer",
    description:
      "Analyzes images using GPT-4o-mini vision capabilities to extract detailed information",
    schema: {
      input: imageAnalyzerInputSchema,
      output: imageAnalyzerOutputSchema,
    },
    async execute(
      _ctx: any,
      input: ImageAnalyzerInput
    ): Promise<ImageAnalyzerOutput> {
      const startTime = Date.now();

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${input.prompt}\n\nRespond with a JSON object containing:\n{
  "description": "A detailed description of what you see",
  "tags": ["list", "of", "relevant", "keywords"],
  "objects": ["list", "of", "distinct", "objects"],
  "colors": ["list", "of", "colors", "in", "order", "of", "prominence"],
  "confidence": 0.95  // Your confidence in the analysis (0-1)
}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${input.base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          response_format: { type: "json_object" },
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error("No response from image analysis");
        }

        const result = JSON.parse(response);
        const processingTime = Date.now() - startTime;

        return {
          success: true,
          description: result.description || "No description available",
          tags: result.tags || [],
          objects: result.objects || [],
          colors: result.colors || [],
          metadata: {
            confidence: result.confidence || 0,
            model: "gpt-4o-mini",
            processingTime,
          },
        };
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("Failed to analyze image");
      }
    },
  };

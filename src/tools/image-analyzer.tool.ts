import { z } from "zod";
import { Tool } from "../lib/agent";
import { openai } from "../lib/openai";

const imageAnalyzerInputSchema = z.object({
  base64Image: z.string(),
  prompt: z.string(),
});

// Allow any JSON structure in the response
const imageAnalyzerOutputSchema = z.object({
  success: z.boolean(),
  result: z.record(z.any()), // Allow any key-value pairs
  metadata: z.object({
    model: z.string(),
    processingTime: z.number(),
  }),
});

type ImageAnalyzerInput = z.infer<typeof imageAnalyzerInputSchema>;
type ImageAnalyzerOutput = z.infer<typeof imageAnalyzerOutputSchema>;

export const imageAnalyzerTool: Tool<ImageAnalyzerInput, ImageAnalyzerOutput> = {
  name: "image_analyzer",
  description: "Analyzes images using GPT-4o-mini vision capabilities to extract detailed information",
  schema: {
    input: imageAnalyzerInputSchema,
    output: imageAnalyzerOutputSchema,
  },
  async execute(_ctx: any, input: ImageAnalyzerInput): Promise<ImageAnalyzerOutput> {
    const startTime = Date.now();

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an image analysis assistant. Structure your responses as JSON objects based on the user's request."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: input.prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${input.base64Image}`
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
        result,
        metadata: {
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

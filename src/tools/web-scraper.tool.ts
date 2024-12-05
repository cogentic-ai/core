import { z } from "zod";
import { Tool } from "../lib/agent";

const webScraperInputSchema = z.object({
  url: z.string().url(),
});

const webScraperOutputSchema = z.object({
  success: z.boolean(),
  content: z.string(),
  metadata: z.object({
    url: z.string().url(),
    timestamp: z.string(),
    statusCode: z.number(),
  }),
});

type WebScraperInput = z.infer<typeof webScraperInputSchema>;
type WebScraperOutput = z.infer<typeof webScraperOutputSchema>;

export const webScraperTool: Tool<WebScraperInput, WebScraperOutput> = {
  name: "web_scraper",
  description: "Fetches and extracts content from a given URL",
  schema: {
    input: webScraperInputSchema,
    output: webScraperOutputSchema,
  },
  async execute(_ctx: any, input: WebScraperInput): Promise<WebScraperOutput> {
    try {
      const response = await fetch(input.url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      return {
        success: true,
        content: text,
        metadata: {
          url: input.url,
          timestamp: new Date().toISOString(),
          statusCode: response.status,
        },
      };
    } catch (error) {
      throw error instanceof Error 
        ? error 
        : new Error("Failed to fetch URL");
    }
  },
};

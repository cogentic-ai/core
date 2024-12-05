import { openai } from "../lib/openai";
import { prisma } from "../lib/db";
import { scrapeWebsite } from "../tools/web-scraper";

export interface ResearchResult {
  success: boolean;
  data?: {
    summary: string;
    relevantInformation: Record<string, any>;
  };
  error?: string;
}

export async function researchWebsite(url: string): Promise<ResearchResult> {
  try {
    // Get the researcher agent
    const agent = await prisma.agent.findUnique({
      where: { name: "researcher" }
    });

    if (!agent) {
      throw new Error("Researcher agent not found");
    }

    // Scrape the website
    const scrapeResult = await scrapeWebsite(url);
    
    if (!scrapeResult.success || !scrapeResult.content) {
      throw new Error(scrapeResult.error || "Failed to scrape website");
    }

    // Ask the AI to analyze the content
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: agent.systemPrompt
        },
        {
          role: "user",
          content: `Analyze this webpage content and extract relevant information: ${scrapeResult.content}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error("No response from AI");
    }

    return {
      success: true,
      data: JSON.parse(response)
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

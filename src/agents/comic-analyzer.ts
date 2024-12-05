import { Agent, RunContext } from "../lib/agent";
import { imageAnalyzerTool } from "../tools/image-analyzer.tool";
import { webScraperTool } from "../tools/web-scraper.tool";

// Define our dependencies
interface ComicAnalyzerDeps {
  openaiKey: string;
}

// Create the agent
export const comicAnalyzer = new Agent<ComicAnalyzerDeps>({
  model: "gpt-4o-mini",
  tools: [imageAnalyzerTool, webScraperTool],
  systemPrompt: `You are a Comic Book Analysis Agent. Your job is to:
1. Analyze comic book cover images to identify title, issue number, and publisher
2. Find additional information about the comic online
3. Return a comprehensive analysis

You have access to these tools:
- image_analyzer: Analyzes the comic book cover image
- web_scraper: Fetches additional information from comic book websites

Always structure your response as JSON with:
{
  "tools": {
    "image_analyzer": { 
      "imageUrl": "...",
      "prompt": "Analyze this comic book cover. Identify the title, issue number, publisher, and key characters."
    },
    "web_scraper": { 
      "url": "..."  // Optional, only if you need more information
    }
  },
  "response": {
    "title": "...",
    "issue": "...",
    "publisher": "...",
    "description": "...",
    "characters": [...],
    "condition": "...",  // If visible in the image
    "publicationDate": "...",  // If available
    "confidence": 0.95
  }
}`,
  options: {
    temperature: 0.7,
    retries: 2,
  }
});

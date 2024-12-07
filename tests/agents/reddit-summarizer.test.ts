import { expect, test, describe } from "bun:test";
import { Agent } from "../../src/lib/agent";
import { webScraper } from "../../src/tools/web-scraper.tool";

describe("Agent Example: Reddit Summarizer", () => {
  test("should summarize r/buildinpublic posts", async () => {
    // Create an agent that summarizes Reddit posts
    const redditSummarizer = new Agent({
      tools: [webScraper],
      systemPrompt: `You are a Reddit post summarizer that helps people stay up to date with their favorite subreddits. You should: Extract key information from each post, create clear summaries`,
      outputSchema: `{
        subreddit: "string",
        posts: [
          {
            title: "string",
            summary: "string",
            url: "string",
          },
        ],
      }`,
    });

    const result = await redditSummarizer.run(
      "Analyze the three most recent posts from r/buildinpublic. Create a concise summary for each post, paying close attention to the comments and responses from other users, what is the overall sentiment.",
      { debug: true }
    );

    console.log("🎨  magic...\n", JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Check response structure
    const { posts, subreddit } = result.data;
    expect(subreddit).toBe("buildinpublic");
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);

    // Check post structure
    const firstPost = posts[0];
    expect(firstPost).toHaveProperty("title");
    expect(firstPost).toHaveProperty("summary");
    expect(firstPost).toHaveProperty("url");

    // Check tool usage
    expect(result.debug?.tools).toBeDefined();
    const toolCalls = Object.keys(result.debug?.tools || {});
    expect(toolCalls).toContain("fetch_web_page");
  }, 30000);
});

async function fetchWebPage({ url }: { url: string }): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  console.log(`Fetching URL: ${jinaUrl}`);

  try {
    const response = await fetch(jinaUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    throw error instanceof Error ? error : new Error("Failed to fetch URL");
  }
}

const webScraperFunction = {
  type: "function",
  function: {
    name: "fetch_web_page",
    description:
      "Fetches the content of a web page. Use this whenever you need to get the content of a URL.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch. Must be a valid HTTP/HTTPS URL.",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
};

// Export both for use in the agent
export const webScraper = {
  implementation: fetchWebPage,
  definition: webScraperFunction,
};

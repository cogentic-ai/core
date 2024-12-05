export interface ScraperResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export async function scrapeWebsite(url: string): Promise<ScraperResponse> {
  try {
    const response = await fetch(`https://r.jina.ai/${url}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return {
      success: true,
      content: text,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

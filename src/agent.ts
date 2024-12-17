import { openai } from "./lib/openai";

interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  mockData?: string;
  json?: boolean;
}

export class Agent {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 1000,
      ...config,
    };
  }

  async run(prompt: string): Promise<string> {
    let content: string;

    // If using mock model, return mockData
    if (this.config.model === "mock") {
      content = this.config.mockData ?? "This is a mock response. I am not a real LLM.";
    } else {
      try {
        const completion = await openai.chat.completions.create({
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        content = completion.choices[0]?.message?.content || "";
      } catch (error) {
        throw new Error(`Agent execution failed: ${error.message}`);
      }
    }

    if (this.config.json) {
      return JSON.stringify({
        content,
        metadata: {
          model: this.config.model,
          timestamp: new Date().toISOString()
        }
      });
    }

    return content;
  }
}

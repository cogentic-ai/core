import { openai } from "./lib/openai";

interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  mockData?: string;
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
    // If using mock model, return mockData
    if (this.config.model === "mock") {
      return this.config.mockData ?? "This is a mock response. I am not a real LLM.";
    }

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

      return completion.choices[0]?.message?.content || "";
    } catch (error) {
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }
}

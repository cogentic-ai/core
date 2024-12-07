import { Agent, AgentConfig } from "./agent";

interface CoreConfig {
  openaiKey: string;
}

class Cogentic {
  private config: CoreConfig;

  constructor(config: CoreConfig) {
    this.config = config;
  }

  /**
   * Creates a new agent with the core's configuration
   */
  agent(config: Omit<AgentConfig, "deps">): Agent {
    return new Agent({ ...config });
  }
}

export const cogentic = new Cogentic({
  openaiKey: process.env.OPENAI_API_KEY!,
});

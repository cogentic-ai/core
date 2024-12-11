import OpenAI from "openai";
import { calculateCost } from "./modelPricing";

export class AgentError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "AgentError";
  }
}

export class ModelRetry extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelRetry";
  }
}

export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  tool_calls?: {
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
}

export interface RunResult<T = string> {
  messages: Message[];
  data: T;
  cost?: number;
}

export interface StreamedRunResult<T = string> extends RunResult<T> {
  stream: AsyncIterator<string>;
}

export interface Cost {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export type ResultValidator<T> = (result: T) => T | Promise<T>;
export type SystemPromptFunc = () => string | Promise<string>;

export interface AgentConfig<T = string> {
  model: string;
  temperature: number;
  apiKey?: string;
  name?: string;
  systemPrompt?: string | string[];
  resultType?: new () => T;
  retries?: number;
  resultRetries?: number;
  tools?: Tool[];
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  func: (...args: any[]) => any;
  retries?: number;
}

export class Agent<T = string> {
  readonly model: string;
  private temperature: number;
  private client: OpenAI;
  private name?: string;
  private systemPrompts: string[];
  private lastRunMessages: Message[] | null = null;
  private defaultRetries: number;
  private maxResultRetries: number;
  private currentRetry: number = 0;
  private tools: Map<string, Tool> = new Map();
  private resultValidators: ResultValidator<T>[] = [];
  private systemPromptFunctions: SystemPromptFunc[] = [];
  private cost: Cost = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };

  constructor(config: AgentConfig<T>) {
    this.model = config.model;
    this.temperature = config.temperature;
    this.name = config.name;
    this.defaultRetries = config.retries ?? 1;
    this.maxResultRetries = config.resultRetries ?? this.defaultRetries;

    this.systemPrompts = Array.isArray(config.systemPrompt)
      ? config.systemPrompt
      : config.systemPrompt
      ? [config.systemPrompt]
      : [];

    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AgentError(
        "OpenAI API key is required. Provide it via constructor or OPENAI_API_KEY environment variable."
      );
    }

    this.client = new OpenAI({ apiKey });

    if (config.tools) {
      for (const tool of config.tools) {
        this.registerTool(tool);
      }
    }
  }

  async run(
    userPrompt: string,
    options: {
      messageHistory?: Message[];
      model?: string;
    } = {}
  ): Promise<RunResult<T>> {
    try {
      const messages = this.prepareMessages(userPrompt, options.messageHistory);
      this.lastRunMessages = messages;

      // Reset tool retries
      for (const tool of this.tools.values()) {
        tool.retries = this.defaultRetries;
      }

      let lastError: Error | undefined;
      for (let i = 0; i < this.defaultRetries; i++) {
        try {
          const response = await this.client.chat.completions.create({
            model: options.model || this.model,
            temperature: this.temperature,
            messages: messages as any[],
            tools: Array.from(this.tools.values()).map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            })),
            tool_choice: this.tools.size > 0 ? "auto" : "none",
          });

          if (!response || Object.keys(response).length === 0) {
            throw new AgentError("Empty response from OpenAI API");
          }

          if (response instanceof Response) {
            const json = await response.json();
            const result = await this.handleResponse(json);
            return {
              messages,
              data: result as T,
              cost: this.cost.totalCost,
            };
          } else {
            const result = await this.handleResponse(response);
            return {
              messages,
              data: result as T,
              cost: this.cost.totalCost,
            };
          }
        } catch (error: any) {
          console.error(
            `OpenAI API Error (attempt ${i + 1}/${this.defaultRetries}):`,
            error.message,
            error.response?.data ? JSON.stringify(error.response.data) : ""
          );
          lastError = error;
          if (i < this.defaultRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            continue;
          }
          throw error;
        }
      }
      throw (
        lastError || new AgentError("Failed to chat with OpenAI after retries")
      );
    } catch (error) {
      if (
        error instanceof ModelRetry &&
        this.currentRetry < this.maxResultRetries
      ) {
        this.currentRetry++;
        return this.run(userPrompt, options);
      }

      if (error instanceof Error) {
        throw new AgentError("Failed to chat with OpenAI", error);
      }
      throw new AgentError("An unknown error occurred");
    }
  }

  async *runStream(
    userPrompt: string,
    options: {
      messageHistory?: Message[];
      model?: string;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const messages = this.prepareMessages(userPrompt, options.messageHistory);
    this.lastRunMessages = messages;

    const stream = await this.client.chat.completions.create({
      model: options.model || this.model,
      temperature: this.temperature,
      messages: messages as any[],
      stream: true,
      tools: Array.from(this.tools.values()).map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: this.tools.size > 0 ? "auto" : "none",
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  private prepareMessages(
    userPrompt: string,
    messageHistory?: Message[]
  ): Message[] {
    const messages: Message[] = [];

    // Add system prompts
    for (const prompt of this.systemPrompts) {
      messages.push({ role: "system", content: prompt });
    }

    // Add dynamic system prompts
    for (const promptFunc of this.systemPromptFunctions) {
      const prompt = promptFunc();
      if (typeof prompt === "string") {
        messages.push({ role: "system", content: prompt });
      }
    }

    // Add message history if provided
    if (messageHistory?.length) {
      messages.push(...messageHistory);
    }

    // Add user prompt
    messages.push({ role: "user", content: userPrompt });

    return messages;
  }

  private async handleResponse(response: any): Promise<T> {
    if (!response || !response.choices || !response.choices[0]) {
      throw new AgentError("Invalid response from OpenAI: missing choices");
    }

    const choice = response.choices[0];
    const message = choice.message;
    if (!message) {
      throw new AgentError("Invalid response from OpenAI: missing message");
    }

    // Update cost tracking
    if (response.usage) {
      this.cost.promptTokens = response.usage.prompt_tokens;
      this.cost.completionTokens = response.usage.completion_tokens;
      this.cost.totalTokens = response.usage.total_tokens;
      
      // Calculate costs using the new pricing module
      const costs = calculateCost(
        this.model,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
      this.cost.inputCost = costs.inputCost;
      this.cost.outputCost = costs.outputCost;
      this.cost.totalCost = costs.totalCost;
    }

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      // For now, we'll just handle the first tool call
      const toolCall = message.tool_calls[0];
      if (toolCall.type !== "function") {
        throw new AgentError(`Unsupported tool type: ${toolCall.type}`);
      }

      const tool = this.tools.get(toolCall.function.name);
      if (!tool) {
        throw new AgentError(`Unknown tool: ${toolCall.function.name}`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await tool.func(args);
        return result as T;
      } catch (error) {
        if (tool.retries && tool.retries > 0) {
          tool.retries--;
          throw new ModelRetry("Tool retry");
        }
        throw error;
      }
    }

    // Handle regular response
    let result = message.content as T;

    // Run result validators
    for (const validator of this.resultValidators) {
      try {
        result = await validator(result);
      } catch (error) {
        if (error instanceof ModelRetry) {
          throw error; // Let run() method handle the retry
        }
        throw error;
      }
    }

    return result;
  }

  addResultValidator(validator: ResultValidator<T>): void {
    this.resultValidators.push(validator);
  }

  addSystemPrompt(promptOrFunc: string | SystemPromptFunc): void {
    if (typeof promptOrFunc === "string") {
      this.systemPrompts.push(promptOrFunc);
    } else {
      this.systemPromptFunctions.push(promptOrFunc);
    }
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, {
      ...tool,
      retries: tool.retries ?? this.defaultRetries,
    });
  }

  getLastRunMessages(): Message[] | null {
    return this.lastRunMessages;
  }

  getCost(): Cost {
    return { ...this.cost };
  }
}

import OpenAI from "openai";
import { calculateCost } from "./modelPricing";
import { z } from "zod";

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
  content: string | null;
  name?: string;
  tool_calls?: {
    id: string;
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

export class AgentConfig {
  private static instance: AgentConfig;
  private _apiKey?: string;

  private constructor() {}

  static getInstance(): AgentConfig {
    if (!AgentConfig.instance) {
      AgentConfig.instance = new AgentConfig();
    }
    return AgentConfig.instance;
  }

  setApiKey(apiKey: string) {
    this._apiKey = apiKey;
  }

  getApiKey(): string | undefined {
    return this._apiKey || process.env.OPENAI_API_KEY;
  }
}

export interface AgentOptions<T = string> {
  model: string;
  temperature?: number;
  apiKey?: string;
  name?: string;
  systemPrompt?: string | string[];
  resultType?: z.ZodType<T>;
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

export interface OpenAIResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: {
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }[];
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class Agent<T = string> {
  private readonly model: string;
  private temperature: number;
  private client: OpenAI;
  private name?: string;
  private systemPrompts: string[];
  private lastRunMessages: Message[] | null = null;
  private defaultRetries: number;
  private maxResultRetries: number;
  private currentRetry: number = 0;
  private tools: Tool[] = [];
  private resultType?: z.ZodType<T>;
  private systemPromptFunctions: SystemPromptFunc[] = [];
  private cost: Cost = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
  };
  private resultValidators: ResultValidator<T>[] = [];

  constructor(options: AgentOptions<T>) {
    this.model = options.model;
    this.temperature = options.temperature ?? 0.2;
    this.name = options.name;
    this.defaultRetries = options.retries ?? 1;
    this.maxResultRetries = options.resultRetries ?? this.defaultRetries;
    this.resultType = options.resultType;

    this.systemPrompts = Array.isArray(options.systemPrompt)
      ? options.systemPrompt
      : options.systemPrompt
      ? [options.systemPrompt]
      : [];

    const apiKey = options.apiKey || AgentConfig.getInstance().getApiKey();
    if (!apiKey) {
      throw new AgentError(
        "OpenAI API key is required. Set it via AgentConfig.getInstance().setApiKey() or OPENAI_API_KEY environment variable."
      );
    }

    this.client = new OpenAI({ apiKey });

    if (options.tools) {
      for (const tool of options.tools) {
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
      const messages = await this.prepareMessages(userPrompt, options.messageHistory);
      this.lastRunMessages = messages;

      // Reset tool retries
      for (const tool of this.tools) {
        tool.retries = this.defaultRetries;
      }

      let lastError: Error | undefined;
      for (let i = 0; i < this.defaultRetries; i++) {
        try {
          const response = await this.client.chat.completions.create({
            model: options.model || this.model,
            temperature: this.temperature,
            messages: messages as any[],
            tools: this.tools.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            })),
            tool_choice: this.tools.length > 0 ? "auto" : "none",
          });

          if (!response || Object.keys(response).length === 0) {
            throw new AgentError("Empty response from OpenAI API");
          }

          if (response instanceof Response) {
            const json = await response.json();
            const data = await this.handleResponse(json);

            // Run result validators
            if (this.resultValidators.length > 0) {
              try {
                let result = data;
                for (const validator of this.resultValidators) {
                  result = await validator(result);
                }
                return {
                  messages,
                  data: result as T,
                  cost: this.cost.totalCost,
                };
              } catch (error) {
                if (error instanceof ModelRetry && this.currentRetry < this.maxResultRetries) {
                  this.currentRetry++;
                  return this.run(userPrompt, options);
                }
                throw error;
              }
            }

            return {
              messages,
              data: data as T,
              cost: this.cost.totalCost,
            };
          } else {
            const data = await this.handleResponse(response);

            // Run result validators
            if (this.resultValidators.length > 0) {
              try {
                let result = data;
                for (const validator of this.resultValidators) {
                  result = await validator(result);
                }
                return {
                  messages,
                  data: result as T,
                  cost: this.cost.totalCost,
                };
              } catch (error) {
                if (error instanceof ModelRetry && this.currentRetry < this.maxResultRetries) {
                  this.currentRetry++;
                  return this.run(userPrompt, options);
                }
                throw error;
              }
            }

            return {
              messages,
              data: data as T,
              cost: this.cost.totalCost,
            };
          }
        } catch (error: any) {
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

      if (error instanceof AgentError) {
        throw error;
      }
      throw new AgentError("Failed to chat with OpenAI", error);
    }
  }

  async *runStream(
    userPrompt: string,
    options: {
      messageHistory?: Message[];
      model?: string;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const messages = await this.prepareMessages(userPrompt, options.messageHistory);
    this.lastRunMessages = messages;

    const stream = await this.client.chat.completions.create({
      model: options.model || this.model,
      temperature: this.temperature,
      messages: messages as any[],
      stream: true,
      tools: this.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: this.tools.length > 0 ? "auto" : "none",
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  private async prepareMessages(
    userPrompt: string,
    messageHistory?: Message[]
  ): Promise<Message[]> {
    const messages: Message[] = [];

    // Add system prompts
    for (const prompt of this.systemPrompts) {
      messages.push({ role: "system", content: prompt });
    }

    // Add dynamic system prompts
    for (const promptFunc of this.systemPromptFunctions) {
      const prompt = await promptFunc();
      if (prompt) {
        messages.push({ role: "system", content: prompt });
      }
    }

    // Add message history if provided
    if (messageHistory) {
      messages.push(...messageHistory);
    }

    // Add user prompt
    messages.push({ role: "user", content: userPrompt });

    return messages;
  }

  private async handleResponse(response: OpenAIResponse): Promise<T> {
    const message = response.choices[0]?.message;
    
    if (!message) {
      throw new AgentError("No message in response");
    }

    // Handle tool calls
    if (message.tool_calls?.length) {
      const toolCall = message.tool_calls[0];
      if (toolCall.type === "function") {
        const tool = this.tools.find((t) => t.name === toolCall.function.name);
        if (!tool) {
          throw new AgentError(`Tool not found: ${toolCall.function.name}`);
        }

        const args = JSON.parse(toolCall.function.arguments);
        const result = await tool.func(args);
        return result as T;
      }
    }

    // Handle regular content
    const content = message.content;
    if (content === null || content === undefined) {
      throw new AgentError("No content in response");
    }

    // Update usage statistics
    if (response.usage) {
      this.cost.promptTokens += response.usage.prompt_tokens;
      this.cost.completionTokens += response.usage.completion_tokens;
      this.cost.totalTokens += response.usage.total_tokens;
      
      // Calculate costs using the pricing module
      const costs = calculateCost(
        this.model,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
      this.cost.inputCost = costs.inputCost;
      this.cost.outputCost = costs.outputCost;
      this.cost.totalCost = costs.totalCost;
    }

    // If we have a result type, try to validate
    if (this.resultType) {
      // For union types that include string, try direct validation first
      const directResult = this.resultType.safeParse(content);
      if (directResult.success) {
        return directResult.data;
      }

      // Try parsing as JSON and validating
      try {
        const parsed = JSON.parse(content);
        const result = this.resultType.safeParse(parsed);
        
        if (result.success) {
          return result.data as T;
        }
        
        // Create a validation error without logging
        throw new AgentError(`Validation failed: ${JSON.stringify(result.error.issues)}`);
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new AgentError("Failed to parse response: Invalid JSON");
        }
        throw error;
      }
    }

    // If no result type or all validation failed, return content as string
    return content as T;
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
    this.tools.push({
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

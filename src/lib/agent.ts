import { openai } from "./openai";
import { z } from "zod";

export interface RunContext<TDeps> {
  deps?: TDeps;
  debug?: boolean;
}

export interface Tool<TInput, TOutput> {
  definition: {
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: {
        type: "object";
        properties: Record<string, any>;
        required: string[];
      };
    };
  };
  implementation: (...args: any[]) => Promise<TOutput>;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  debug?: {
    prompt?: string;
    response?: string;
    tools?: Record<string, any>;
    cost?: any;
    costInDollars?: {
      totalCost: number;
      breakdown: {
        inputCost: number;
        cachedCost: number;
        outputCost: number;
      };
    };
  };
}

export interface AgentConfig {
  systemPrompt: string;
  model?: string;
  tools?: any[];
  outputSchema?: string;
  options?: {
    temperature?: number;
  };
}

export class Agent<TDeps = any> {
  private tools: Map<string, Tool<any, any>> = new Map();
  private model: string;
  private systemPrompt: string;
  private config: any;
  private options: { temperature?: number };

  constructor(config: AgentConfig) {
    this.model = "gpt-4o-mini";
    this.systemPrompt = config.systemPrompt;
    this.options = config.options ?? {};
    this.config = config;

    // Register tools from config
    config.tools?.forEach((tool) => {
      const name = tool.definition.function.name;
      if (this.tools.has(name)) {
        throw new Error(`Tool with name ${name} already exists`);
      }
      this.tools.set(name, tool);
    });
  }

  async run(input: string, ctx?: RunContext<TDeps>): Promise<AgentResult> {
    try {
      const messages: any[] = [
        {
          role: "system",
          content: `${this.systemPrompt} ${
            this.config.outputSchema &&
            "\n FOR THE FINAL SUMMARY,USE THE FOLLOWING JSON OUTPUT_SCHEMA:" +
              this.config.outputSchema
          }`,
        },
        { role: "user", content: input },
      ];

      const tools = Array.from(this.tools.values()).map((t) => t.definition);
      const toolResults: Record<string, any> = {};
      const toolCounts: Record<string, number> = {};
      const MAX_TOOL_CALLS = 3;

      while (true) {
        if (ctx?.debug) {
          // console.log("Messages:", messages);
        }

        const completion = await openai.chat.completions.create({
          model: this.model,
          messages,
          tools,
          tool_choice: "auto",
          response_format: { type: "json_object" },
          temperature: this.options.temperature ?? 0.7,
        });

        const message = completion.choices[0].message;
        if (ctx?.debug) {
          console.log("Message from model:", message);
        }

        if (!message) {
          throw new Error("No response from OpenAI");
        }

        // If the model wants to call a function
        if (message.tool_calls) {
          // Execute all tool calls in parallel
          const toolTasks = message.tool_calls.map(async (toolCall) => {
            const tool = this.tools.get(toolCall.function.name);
            if (!tool) {
              return {
                role: "tool",
                content: `Error: Tool ${toolCall.function.name} not found`,
                tool_call_id: toolCall.id,
              };
            }

            try {
              const args = JSON.parse(toolCall.function.arguments);
              const result = await tool.implementation(args);
              toolResults[toolCall.function.name] = result;
              return {
                role: "tool",
                content: result,
                tool_call_id: toolCall.id,
              };
            } catch (error) {
              return {
                role: "tool",
                content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                tool_call_id: toolCall.id,
              };
            }
          });

          // Add the assistant's tool calls to the conversation
          messages.push({
            role: "assistant",
            content: null,
            tool_calls: message.tool_calls,
          });

          // Add all tool results to the conversation
          const results = await Promise.all(toolTasks);
          messages.push(...results);
          continue;
        }

        // If no function call, this is the final response
        try {
          return {
            success: true,
            data: JSON.parse(message.content as string),
            debug: ctx?.debug
              ? {
                  prompt: input,
                  tools: toolResults,
                  cost: completion.usage,
                  costInDollars: calculateCost(completion.usage),
                }
              : null,
          };
        } catch (error) {
          throw new Error(`Failed to parse final response: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        debug: ctx?.debug
          ? {
              prompt: input,
            }
          : undefined,
      };
    }
  }
}

function calculateCost(usage: any) {
  const nonCachedTokens =
    usage.prompt_tokens - (usage.prompt_tokens_details?.cached_tokens || 0);
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
  const outputTokens = usage.completion_tokens;

  const inputCost = (nonCachedTokens / 1_000_000) * 0.15;
  const cachedCost = (cachedTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.6;

  return {
    totalCost: inputCost + cachedCost + outputCost,
    breakdown: {
      inputCost,
      cachedCost,
      outputCost,
    },
  };
}

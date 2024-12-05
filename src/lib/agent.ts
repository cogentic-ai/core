import { openai } from "./openai";
import { z } from "zod";

export interface RunContext<TDeps> {
  deps: TDeps;
  debug?: boolean;
}

export interface Tool<TInput, TOutput> {
  name: string;
  description: string;
  schema: {
    input: z.ZodType<TInput>;
    output: z.ZodType<TOutput>;
  };
  execute: (ctx: RunContext<any>, input: TInput) => Promise<TOutput>;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  debug?: {
    prompt?: string;
    response?: string;
    tools?: Record<string, any>;
  };
}

export interface AgentConfig {
  model: string;
  systemPrompt: string;
  tools: Tool<any, any>[];
  options?: {
    retries?: number;
    temperature?: number;
  };
}

export class Agent<TDeps = any> {
  private tools: Map<string, Tool<any, any>> = new Map();
  private model: string;
  private systemPrompt: string;
  private options: {
    retries?: number;
    temperature?: number;
  };

  constructor(config: AgentConfig) {
    this.model = config.model;
    this.systemPrompt = config.systemPrompt;
    this.options = config.options ?? {};

    // Register tools from config
    config.tools.forEach(tool => {
      if (this.tools.has(tool.name)) {
        throw new Error(`Tool with name ${tool.name} already exists`);
      }
      this.tools.set(tool.name, tool);
    });
  }

  private buildPrompt(userInput: string): string {
    const toolDescriptions = Array.from(this.tools.values())
      .map(
        (tool) => `
Tool: ${tool.name}
Description: ${tool.description}
Input Schema: ${JSON.stringify(tool.schema.input.shape)}
Output Schema: ${JSON.stringify(tool.schema.output.shape)}
`
      )
      .join("\n");

    return `${this.systemPrompt}

Available Tools:
${toolDescriptions}

User Input: ${userInput}`;
  }

  async run(input: string, ctx: RunContext<TDeps>): Promise<AgentResult> {
    try {
      const prompt = this.buildPrompt(input);
      
      if (ctx.debug) {
        console.log("🤖 Agent Prompt:", prompt);
      }

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: prompt,
          },
        ],
        temperature: this.options.temperature ?? 0.7,
        response_format: { type: "json_object" },
      });

      const response = completion.choices[0]?.message?.content;
      
      if (ctx.debug) {
        console.log("📝 Agent Response:", response);
      }

      if (!response) {
        throw new Error("No response from AI");
      }

      const result = JSON.parse(response);

      // If the response includes tool calls, execute them
      if (result.tools) {
        const toolResults: Record<string, any> = {};
        
        for (const [toolName, toolInput] of Object.entries<any>(result.tools)) {
          const tool = this.tools.get(toolName);
          if (!tool) {
            throw new Error(`Tool ${toolName} not found`);
          }

          // Validate input
          const validatedInput = tool.schema.input.parse(toolInput);
          
          // Execute tool
          const toolResult = await tool.execute(ctx, validatedInput);
          
          // Validate output
          const validatedOutput = tool.schema.output.parse(toolResult);
          
          toolResults[toolName] = validatedOutput;
        }

        return {
          success: true,
          data: result.response,
          debug: ctx.debug ? {
            prompt,
            response,
            tools: toolResults,
          } : undefined,
        };
      }

      return {
        success: true,
        data: result,
        debug: ctx.debug ? {
          prompt,
          response,
        } : undefined,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        debug: ctx.debug ? {
          prompt: this.buildPrompt(input),
        } : undefined,
      };
    }
  }
}

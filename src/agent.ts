import { openai as defaultOpenAI } from "./lib/openai";
import type OpenAI from "openai";
import { z } from "zod";
import {
  Tool,
  convertToolsToOpenAIFormat,
  executeToolCall,
  createToolsSystemPrompt,
} from "./lib/tools";
import { Message, Memory } from "./lib/memory";
import { validateAndFormatJSON, safeJSONParse, zodToJson } from "./lib/utils";

export interface AgentConfig<TResponse> {
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  mockData?: string;
  openaiClient?: OpenAI;
  responseSchema?: z.ZodType<TResponse>;
  debug?: boolean;
  maxMemoryMessages?: number;
  keepSystemPrompt?: boolean;
  tools?: Tool[];
}

export class Agent<TResponse = string> {
  private config: AgentConfig<TResponse>;
  private openaiClient: OpenAI;
  private memory: Memory;

  constructor(config: AgentConfig<TResponse>) {
    this.config = {
      temperature: 0.7,
      maxTokens: 1000,
      maxMemoryMessages: 10,
      keepSystemPrompt: true,
      ...config,
    };

    // Use provided client or default
    this.openaiClient = config.openaiClient || defaultOpenAI;

    // Initialize memory
    this.memory = new Memory(
      this.config.maxMemoryMessages,
      this.config.keepSystemPrompt
    );

    // Add system prompt to memory
    this.memory.add({
      role: "system",
      content: this.config.systemPrompt,
    });
  }

  // Helper method to add messages to memory
  addToMemory(...messages: Message[]) {
    this.memory.add(...messages);
  }

  // Helper method to clear memory
  clearMemory(keepSystemPrompt = this.config.keepSystemPrompt) {
    this.memory.clear(keepSystemPrompt);
  }

  // Get current memory state
  getMemory(): Message[] {
    return this.memory.getAll();
  }

  async run(
    prompt: string,
    options: {
      messageHistory?: Message[];
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<TResponse> {
    const messages: Message[] = [
      { role: "system", content: this.config.systemPrompt },
      ...(options.messageHistory || []),
      { role: "user", content: prompt },
    ];

    while (true) {
      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        tools: this.config.tools
          ? convertToolsToOpenAIFormat(this.config.tools)
          : undefined,
      });

      const response = completion.choices[0];
      messages.push({
        role: response.message.role,
        content: response.message.content || "",
      });

      // If there's a tool call, execute it and continue the conversation
      if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        const toolCall = response.message.tool_calls[0];
        const tool = this.config.tools?.find(
          (t) => t.name === toolCall.function.name
        );

        if (!tool) {
          throw new Error(`Tool ${toolCall.function.name} not found`);
        }

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await tool.handler(args);

          messages.push({
            role: "assistant",
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });

          // Continue the conversation
          continue;
        } catch (error) {
          throw new Error(`Failed to execute tool ${toolCall.function.name}: ${error}`);
        }
      }

      // If there's no tool call, try to parse the response
      const content = response.message.content;
      if (!content) {
        throw new Error("No content in response");
      }

      const parsedContent = safeJSONParse(content);
      const parsedResponse =
        this.config.responseSchema.safeParse(parsedContent);

      if (!parsedResponse.success) {
        console.error("Response does not match schema:", parsedResponse.error);
        throw new Error("Response validation failed");
      }

      return parsedResponse.data;
    }
  }
}

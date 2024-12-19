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

interface AgentConfig<TResponse> {
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
    options: { messages?: Message[] } = {}
  ): Promise<TResponse> {
    let content: string;
    const response_format = this.config.responseSchema ? "json_object" : "text";

    // If using mock model, return mockData
    if (this.config.model === "mock") {
      content =
        this.config.mockData ?? "This is a mock response. I am not a real LLM.";
      if (this.config.responseSchema) {
        content = validateAndFormatJSON(content);
      }

      // Handle tool calls in mock data
      const mockData = safeJSONParse(content);
      if (mockData?.tool_calls) {
        for (const toolCall of mockData.tool_calls) {
          if (toolCall.type === "function" && this.config.tools) {
            return executeToolCall(this.config.tools, toolCall);
          }
        }
      }
    } else {
      try {
        const messages: Message[] = [];

        // Add schema info to system prompt if using responseSchema
        if (this.config.responseSchema) {
          messages.push({
            role: "system",
            content: `Your response must use JSON and match this Zod schema, but use normal JSON instead of Zod format:\n${JSON.stringify(
              zodToJson(this.config.responseSchema),
              null,
              2
            )}`,
          });
        }

        // Add available tools to the system prompt
        if (this.config.tools?.length) {
          messages.push({
            role: "system",
            content: createToolsSystemPrompt(this.config.tools),
          });
        }

        // Add message history if provided
        if (options.messages) {
          messages.push(...options.messages);
        }

        // Add memory messages
        messages.push(...this.memory.getAll());

        const userMessage = {
          role: "user" as const,
          content: prompt,
        };
        messages.push(userMessage);

        const completion = await this.openaiClient.chat.completions.create({
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          messages,
          response_format: { type: response_format },
          tools: this.config.tools
            ? convertToolsToOpenAIFormat(this.config.tools)
            : undefined,
        });

        content = completion.choices[0]?.message?.content || "";
        const toolCalls = completion.choices[0]?.message?.tool_calls;

        // Handle tool calls
        if (toolCalls?.length && this.config.tools) {
          for (const toolCall of toolCalls) {
            if (toolCall.type === "function") {
              return executeToolCall(this.config.tools, toolCall);
            }
          }
        }

        this.addToMemory(userMessage, { role: "assistant", content });
      } catch (error) {
        console.error("OpenAI API Error:", error);
        throw error;
      }
    }

    // If responseSchema is provided, validate and parse the response
    if (this.config.responseSchema) {
      if (this.config.debug) {
        const responseJson = zodToJson(this.config.responseSchema);
        console.log("Expected Schema:", JSON.stringify(responseJson));
        console.log("Response:", content);
      }

      const parsedContent = safeJSONParse(content);
      const parsedResponse = this.config.responseSchema.safeParse(parsedContent);

      if (!parsedResponse.success) {
        console.error("Response does not match schema:", parsedResponse.error);
        throw new Error("Response does not match schema");
      }

      return this.config.responseSchema.parse(parsedContent);
    }

    return content as TResponse;
  }
}

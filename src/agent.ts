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

    let loopCount = 0;
    while (true) {
      console.log(`Agent running... ${loopCount}`);
      loopCount++;

      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: options.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        tools: this.config.tools
          ? convertToolsToOpenAIFormat(this.config.tools)
          : undefined,
      });
      console.log(`Completion: ${JSON.stringify(completion)} `);

      const response = completion.choices[0];
      console.log(
        `Response: ${response.message.role}: ${response.message.content}`
      );

      // If there's a tool call, execute it and continue the conversation
      if (
        response.message.tool_calls &&
        response.message.tool_calls.length > 0
      ) {
        // Add the assistant's message with all tool calls
        messages.push(response.message);

        // Execute all tool calls and add their responses
        for (const toolCall of response.message.tool_calls) {
          const tool = this.config.tools?.find(
            (t) => t.name === toolCall.function.name
          );

          if (!tool) {
            throw new Error(`Tool ${toolCall.function.name} not found`);
          }

          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await tool.function(args);

            console.log("RESULT IN AGENT: ", result);

            // Add the function's response message
            messages.push({
              role: "tool",
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            });
          } catch (error) {
            throw new Error(
              `Failed to execute tool ${toolCall.function.name}: ${error}`
            );
          }
        }

        // Continue the conversation after all tool calls are handled
        continue;
      }

      // If there's no tool call, add the response and process it
      messages.push(response.message);

      const content = response.message.content;
      if (!content) {
        throw new Error("No content in response");
      }

      // If we have a response schema, validate and parse the response
      if (this.config.responseSchema) {
        const parsedContent = safeJSONParse(content);
        const parsedResponse =
          this.config.responseSchema.safeParse(parsedContent);

        if (!parsedResponse.success) {
          console.error(
            "Response does not match schema:",
            parsedResponse.error
          );
          throw new Error("Response validation failed");
        }

        return parsedResponse.data;
      }

      // If no response schema, return the content directly
      return content as TResponse;
    }
  }
}

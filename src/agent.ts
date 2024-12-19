import { openai as defaultOpenAI } from "./lib/openai";
import type OpenAI from "openai";
import { z } from "zod";
import { zodToJson } from "./lib/zodUtils";
import { log } from "console";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

interface AgentConfig<T extends z.ZodType> {
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  mockData?: string;
  openaiClient?: OpenAI;
  responseType?: T;
  debug?: boolean;
}

interface RunOptions {
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export class Agent<T extends z.ZodType> {
  private config: AgentConfig<T>;
  private openaiClient: OpenAI;

  constructor(config: AgentConfig<T>) {
    this.config = {
      temperature: 0.7,
      maxTokens: 1000,
      ...config,
    };
    this.openaiClient = config.openaiClient || defaultOpenAI;
  }

  private validateAndFormatJSON(content: string): string {
    try {
      JSON.parse(content);
      return content;
    } catch {
      return JSON.stringify({ value: content });
    }
  }

  async run(
    prompt: string,
    options: RunOptions = {}
  ): Promise<T extends z.ZodType ? z.infer<T> : string> {
    let content: string;
    const response_format = this.config.responseType ? "json_object" : "text";

    // If using mock model, return mockData
    if (this.config.model === "mock") {
      content =
        this.config.mockData ?? "This is a mock response. I am not a real LLM.";
      if (this.config.responseType) {
        content = this.validateAndFormatJSON(content);
      }
    } else {
      try {
        const messages: Message[] = [
          {
            role: "system" as const,
            content: this.config.systemPrompt,
          },
        ];

        // Add schema info to system prompt if using responseType
        if (this.config.responseType) {
          const schemaMessage = {
            role: "system" as const,
            content: `Your response must use JSON and match this Zod schema, but use normal JSON instead of Zod format:\n${JSON.stringify(
              zodToJson(this.config.responseType),
              null,
              2
            )}`,
          };
          messages.push(schemaMessage);
        }

        // Add message history if provided
        if (options.messages) {
          messages.push(...options.messages);
        }

        messages.push({ role: "user" as const, content: prompt });

        const completion = await this.openaiClient.chat.completions.create({
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          messages,
          response_format: { type: response_format },
        });

        content = completion.choices[0]?.message?.content || "";
      } catch (error) {
        console.error("OpenAI API Error:", error);
        throw error;
      }
    }

    // If responseType is provided, validate and parse the response
    if (this.config.responseType) {
      if (this.config.debug) {
        const responseJson = zodToJson(this.config.responseType);
        console.log("Expected Schema:", JSON.stringify(responseJson));
        console.log("Response:", content);
      }

      const parsedContent = JSON.parse(content);
      const parsedResponse = this.config.responseType.safeParse(parsedContent);
      console.log("Response:", parsedResponse);

      if (!parsedResponse.success) {
        // TODO: instead of throwing an error, we should force the validation using an LLM
        console.error("Response does not match schema:", parsedResponse.error);
        throw new Error("Response does not match schema");
      }

      return this.config.responseType.parse(parsedContent);
    }

    return content;
  }
}

import type OpenAI from "openai";
import { z } from "zod";

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  handler: (args: any) => Promise<any>;
}

export interface ToolCall {
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export function convertToolsToOpenAIFormat(tools: Tool[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}

export function executeToolCall(tools: Tool[], toolCall: ToolCall): any {
  const tool = tools.find(t => t.name === toolCall.function.name);
  if (!tool) {
    throw new Error(`Tool ${toolCall.function.name} not found`);
  }
  
  const args = JSON.parse(toolCall.function.arguments);
  return tool.handler(args);
}

export function createToolsSystemPrompt(tools: Tool[]): string {
  return `You have access to the following tools:\n${JSON.stringify(
    tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    })),
    null,
    2
  )}`;
}

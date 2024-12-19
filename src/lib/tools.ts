import type OpenAI from "openai";

export interface Tool {
  name: string;
  description: string;
  function: (...args: any[]) => any;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
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
  return tool.function(...Object.values(args));
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

import type OpenAI from "openai";
import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { zodToJson } from "./utils";

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  function: (args: any) => Promise<any>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export function convertToolsToOpenAIFormat(
  tools: Tool[]
): ChatCompletionTool[] {
  console.log("TOOLS:", tools);
  console.log("PARMAS:", tools[0].parameters);
  console.log("ZOD TO JSON: ", zodToJson(tools[0].parameters));

  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJson(tool.parameters) as {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
      },
    },
  }));
}

export async function executeToolCall(tools: Tool[], toolCall: ToolCall) {
  const tool = tools.find((t) => t.name === toolCall.function.name);

  if (!tool) {
    throw new Error(`Tool ${toolCall.function.name} not found`);
  }

  const args = JSON.parse(toolCall.function.arguments);
  return tool.function(args);
}

export function createToolsSystemPrompt(tools: Tool[]): string {
  return `You have access to the following tools:

${tools
  .map(
    (tool) => `${tool.name}: ${tool.description}
Parameters: ${JSON.stringify(zodToJson(tool.parameters), null, 2)}`
  )
  .join("\n\n")}

To use a tool, respond with a tool_calls message.`;
}

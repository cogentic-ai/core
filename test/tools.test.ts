import { describe, expect, mock, test } from "bun:test";
import { z } from "zod";
import { Agent } from "../src/agent";
import { Tool } from "../src/lib/tools";
import OpenAI from "openai";

describe("Tool Calling", () => {
  test("should execute a simple tool", async () => {
    const mockTool: Tool = {
      name: "test_tool",
      description: "A test tool",
      parameters: z.object({
        message: z.string(),
      }),
      handler: mock((args: any) => Promise.resolve({ result: args.message })),
    };

    let callCount = 0;
    const mockOpenAI = {
      chat: {
        completions: {
          create: mock(async () => {
            callCount++;
            if (callCount === 1) {
              // First call: Return tool call
              return {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: null,
                      tool_calls: [
                        {
                          id: "1",
                          type: "function",
                          function: {
                            name: "test_tool",
                            arguments: JSON.stringify({ message: "hello world" }),
                          },
                        },
                      ],
                    },
                  },
                ],
              };
            } else {
              // Second call: Return final response
              return {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: JSON.stringify({ response: "Tool executed successfully" }),
                    },
                  },
                ],
              };
            }
          }),
        },
      },
    } as unknown as OpenAI;

    const agent = new Agent({
      model: "gpt-4-mini",
      systemPrompt: "You are a test agent",
      tools: [mockTool],
      responseSchema: z.object({
        response: z.string(),
      }),
      openaiClient: mockOpenAI,
    });

    const response = await agent.run(
      "Use the test_tool with message 'hello world'"
    );

    expect(mockTool.handler).toHaveBeenCalledWith({ message: "hello world" });
    expect(response).toEqual({ response: "Tool executed successfully" });
    expect(callCount).toBe(2);
  });
});

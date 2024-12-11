import { describe, test, expect } from "bun:test";
import { Tool, generateOpenAISchema, ToolExecutor } from "../src/Tools";
import { z } from "zod";

describe("Tools", () => {
  test("should create a tool with metadata and validation", async () => {
    const addNumbers: Tool<void, { x: number, y: number }, number> = {
      name: "add",
      description: "Adds two numbers together",
      parametersSchema: z.object({
        x: z.number(),
        y: z.number()
      }),
      fn: async (ctx, params) => params.x + params.y
    };

    expect(addNumbers.name).toBe("add");
    expect(addNumbers.description).toBe("Adds two numbers together");

    // Function should work with valid parameters
    const result = await addNumbers.fn({ deps: undefined, retry: 0 }, { x: 2, y: 3 });
    expect(result).toBe(5);

    // Schema should validate parameters
    const schema = addNumbers.parametersSchema!;
    expect(() => schema.parse({ x: "2", y: 3 })).toThrow();
  });

  test("should generate OpenAI function schema", () => {
    const searchTool: Tool = {
      name: "search",
      description: "Search for items in the database",
      parametersSchema: z.object({
        query: z.string(),
        filters: z.object({
          category: z.enum(["books", "movies", "music"]).optional(),
          maxPrice: z.number().optional()
        }),
        limit: z.number().default(10)
      }),
      fn: async () => {}
    };

    const schema = generateOpenAISchema(searchTool);
    expect(schema).toEqual({
      name: "search",
      description: "Search for items in the database",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          filters: {
            type: "object",
            properties: {
              category: { 
                type: "string",
                enum: ["books", "movies", "music"]
              },
              maxPrice: { type: "number" }
            }
          },
          limit: { type: "number" }
        },
        required: ["query", "filters"]
      }
    });
  });

  test("should handle tools without parameters", () => {
    const simpleTool: Tool = {
      name: "ping",
      description: "Check if service is alive",
      fn: async () => "pong"
    };

    const schema = generateOpenAISchema(simpleTool);
    expect(schema).toEqual({
      name: "ping",
      description: "Check if service is alive",
      parameters: {
        type: "object",
        properties: {}
      }
    });
  });

  test("should execute tool with lifecycle hooks", async () => {
    const events: string[] = [];
    const divideNumbers: Tool<void, { x: number, y: number }, number> = {
      name: "divide",
      description: "Divides two numbers",
      parametersSchema: z.object({
        x: z.number(),
        y: z.number()
      }),
      prepare: async (ctx) => {
        events.push("prepare");
        return { name: "divide", description: "Divides two numbers" };
      },
      beforeExecute: async (ctx, params) => {
        events.push("beforeExecute");
        if (params.y === 0) {
          throw new Error("Cannot divide by zero");
        }
      },
      fn: async (ctx, params) => {
        events.push("execute");
        return params.x / params.y;
      },
      afterExecute: async (ctx, params, result) => {
        events.push("afterExecute");
      },
      onError: async (ctx, params, error) => {
        events.push("onError");
        if (error.message === "Cannot divide by zero") {
          return Infinity;
        }
        throw error;
      }
    };

    const executor = new ToolExecutor(divideNumbers);

    // Test successful execution
    const result = await executor.execute(
      { deps: undefined, retry: 0 },
      { x: 10, y: 2 }
    );
    expect(result).toBe(5);
    expect(events).toEqual([
      "prepare",
      "beforeExecute",
      "execute",
      "afterExecute"
    ]);

    // Reset events
    events.length = 0;

    // Test error handling
    const infinityResult = await executor.execute(
      { deps: undefined, retry: 0 },
      { x: 10, y: 0 }
    );
    expect(infinityResult).toBe(Infinity);
    expect(events).toEqual([
      "prepare",
      "beforeExecute",
      "onError"
    ]);
  });
});

import { Agent, createToolsSystemPrompt, Tool } from "../src";
import { z } from "zod";

// Define our calculator tool
const calculatorTool: Tool = {
  name: "calculator",
  description: "A calculator that can perform basic arithmetic operations",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  function: async (args: {
    operation: "add" | "subtract" | "multiply" | "divide";
    a: number;
    b: number;
  }) => {
    console.log(`Executing CALCULATOR ${args.operation}(${args.a}, ${args.b})`);
    switch (args.operation) {
      case "add":
        return args.a + args.b;
      case "subtract":
        return args.a - args.b;
      case "multiply":
        return args.a * args.b;
      case "divide":
        if (args.b === 0) {
          throw new Error("Cannot divide by zero");
        }
        return args.a / args.b;
    }
  },
};

// Define our response schema
const responseSchema = z.object({
  explanation: z.string(),
  result: z.number(),
});

// Create our agent
const agent = new Agent({
  model: "gpt-4o-mini",
  systemPrompt: `You are a helpful math assistant that can perform calculations.
  
  ${createToolsSystemPrompt([calculatorTool])}
  
  Always format your final response as a JSON object with these fields:
  {
    "explanation": "A text explanation of the calculation",
    "result": "The numeric result of the calculation"
  }
  
  If you don't know the answer, just say that you don't know. Don't try to make up an answer.`,
  tools: [calculatorTool],
  responseSchema,
});

// Example usage
async function main() {
  try {
    // Simple addition
    console.log("\n=== Addition Example ===");
    const result1 = await agent.run("What is 15 plus 27?");
    console.log(result1);

    // More complex calculation with explanation
    console.log("\n=== Division Example ===");
    const result2 = await agent.run(
      "If I have 120 items and need to divide them into 5 equal groups, how many items will be in each group?"
    );
    console.log(result2);

    // Multiple operations
    console.log("\n=== Complex Example ===");
    const result3 = await agent.run(
      "If I multiply 8 by 6 and then subtract 13, what do I get?"
    );
    console.log(result3);
  } catch (error) {
    console.error("Error:", error);
  }
}
main();

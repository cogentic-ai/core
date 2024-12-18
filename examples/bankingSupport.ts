import { z } from "zod";
import { Agent } from "../src/agent";

// Define the schema for the support agent's responses
const SupportResult = z.object({
  support_advice: z.string().describe("Advice returned to the customer"),
  block_card: z.boolean().describe("Whether to block their card"),
  risk: z.number().min(0).max(10).describe("Risk level of query"),
});

// Create an agent with the response type
const supportAgent = new Agent({
  model: "gpt-4o-mini",
  responseType: SupportResult,
  systemPrompt:
    "You are a support agent in our bank. Help customers with their queries and assess risk levels.",
});

async function handleSupportRequest(query: string) {
  // The response is automatically validated against the schema
  const result = await supportAgent.run(query);

  // TypeScript knows the shape of the response
  console.log("Support Advice:", result.support_advice);
  console.log("Block Card:", result.block_card);
  console.log("Risk Level:", result.risk);

  // Take action based on the response
  if (result.block_card) {
    console.log(" High-risk situation detected! Blocking card...");
  }

  if (result.risk > 7) {
    console.log(" Escalating to fraud department...");
  }
}

// Example usage
await handleSupportRequest("Hi, I lost my card in a taxi last night.");
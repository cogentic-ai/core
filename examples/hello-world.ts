import { Agent } from "../src/agent";

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY environment variable not set");
    process.exit(1);
  }

  // Create an agent instance
  const agent = new Agent({
    model: "gpt-4o-mini",
    apiKey,
  });

  try {
    // Run a simple prompt
    const response = await agent.run("Say 'Hello, World!' in a creative way.");
    console.log("AI Response:", response);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();

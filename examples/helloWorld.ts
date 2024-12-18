import { Agent } from "../src/agent";

async function main() {
  const agent = new Agent({
    model: "gpt-4o-mini",
    systemPrompt: "You are a helpful AI assistant.",
  });

  try {
    const response = await agent.run("Say 'Hello, World!' in a creative way.");
    console.log("AI Response:", response);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main();

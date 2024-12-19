import { Agent, Message } from "../src/agent";

async function main() {
  const agent = new Agent({
    model: "gpt-4o-mini",
    systemPrompt:
      "You are a friendly AI assistant who remembers previous conversations and maintains context.",
  });

  // Initialize conversation history
  const messages: Message[] = [];

  // First interaction
  console.log("\nUser: Let's talk about your favorite color.");
  const response1 = await agent.run("Let's talk about your favorite color.", {
    messages,
  });
  console.log("Assistant:", response1);

  // Update conversation history
  messages.push(
    { role: "user", content: "Let's talk about your favorite color." },
    { role: "assistant", content: response1 }
  );

  // Second interaction
  console.log("\nUser: Why did you choose that color?");
  const response2 = await agent.run("Why did you choose that color?", {
    messages,
  });
  console.log("Assistant:", response2);

  messages.push(
    { role: "user", content: "Why did you choose that color?" },
    { role: "assistant", content: response2 }
  );

  // Third interaction - testing long-term memory
  console.log("\nUser: Can you remind me what we've been discussing?");
  const response3 = await agent.run(
    "Can you remind me what we've been discussing?",
    { messages }
  );
  console.log("Assistant:", response3);
}

main().catch(console.error);

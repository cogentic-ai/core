import { Agent, Message } from "../src/agent";

async function main() {
  const agent = new Agent({
    model: "gpt-4o-mini",
    systemPrompt:
      "You are a friendly AI assistant who remembers previous conversations and maintains context.",
    maxMemoryMessages: 5, // Keep last 5 messages
    keepSystemPrompt: true, // Always keep system prompt
  });

  // First interaction
  const message1: Message = {
    role: "user",
    content: "Let's talk about your favorite color.",
  };
  const response1 = await agent.run(message1.content, {});

  console.log("\nMemory after first interaction:");
  console.log(agent.getMemory());

  // Second interaction
  const message2: Message = {
    role: "user",
    content: "Why did you choose that color?",
  };

  await agent.run(message2.content);
  console.log("\nMemory after second interaction:");
  console.log(agent.getMemory());

  // Third interaction - testing long-term memory
  const message3: Message = {
    role: "user",
    content: "Can you remind me what we've been discussing?",
  };
  await agent.run(message3.content);

  console.log("\nMemory after third interaction:");
  console.log(agent.getMemory());

  // Clear memory but keep system prompt
  agent.clearMemory(true);
  console.log("\nMemory after clearing (keeping system prompt):");
  console.log(agent.getMemory());
}

main().catch(console.error);

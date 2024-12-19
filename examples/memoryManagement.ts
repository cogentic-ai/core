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
  const message1: Message = {
    role: "user",
    content: "Let's talk about your favorite color.",
  };
  const response1 = await agent.run(message1.content, {
    messages,
  });

  messages.push(message1);
  messages.push({ role: "assistant", content: response1 });

  console.log(messages);

  // Second interaction
  const message2: Message = {
    role: "user",
    content: "Why did you choose that color?",
  };
  const response2 = await agent.run(message2.content, {
    messages,
  });

  messages.push(message2);
  messages.push({ role: "assistant", content: response2 });

  console.log(messages);

  // Third interaction - testing long-term memory
  const message3: Message = {
    role: "user",
    content: "Can you remind me what we've been discussing?",
  };
  const response3 = await agent.run(message3.content, {
    messages,
  });

  messages.push(message3);
  messages.push({ role: "assistant", content: response3 });

  console.log(messages);
}

main().catch(console.error);

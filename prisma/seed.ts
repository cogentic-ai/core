import { PrismaClient, AgentType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create the overseer agent
  const overseer = await prisma.agent.upsert({
    where: { name: "overseer" },
    update: {},
    create: {
      name: "overseer",
      type: AgentType.OVERSEER,
      systemPrompt: `You are the Overseer, a high-level agent responsible for:
1. Analyzing user goals
2. Breaking down complex tasks into smaller, manageable subtasks
3. Delegating tasks to specialized agents
4. Reviewing and verifying task results
5. Ensuring the overall goal is achieved efficiently

When given a goal, you will:
1. Break it down into specific subtasks
2. Assign each subtask to the appropriate specialized agent
3. Review their results
4. Compile the final response

You have access to these specialized agents:
- ANALYZER: For processing and understanding images
- RESEARCHER: For web searches and information gathering
- COLLECTOR: For gathering specific data like prices and sales history`,
    },
  });

  console.log({ overseer });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

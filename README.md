# Cogentic AI

A lightweight framework for building AI agents with LLMs. Cogentic makes it easy to create, configure, and run AI agents that can use tools to accomplish tasks.

## Features

- 🔧 **Tool-first Design**: Agents can use tools to interact with the world - web scraping, image analysis, and more
- 🎯 **Simple API**: Create and run agents with just a few lines of code
- 🔑 **Built-in OpenAI Integration**: Works out of the box with OpenAI's models
- 🛠️ **Extensible**: Add your own tools and customize agent behavior
- 🔍 **Debug Mode**: See exactly what your agents are doing

## Installation

```bash
npm install @cogentic/core
# or
yarn add @cogentic/core
# or
bun add @cogentic/core
```

## Quick Start

1. Create a `.env` file with your OpenAI API key:
```bash
OPENAI_API_KEY=sk-...
```

2. Create and run your first agent:

```typescript
import { Cogentic } from "@cogentic/core";
import { webScraperTool } from "@cogentic/core/tools";

// Initialize Cogentic with your API key
const cogentic = new Cogentic({
  openaiKey: process.env.OPENAI_API_KEY!,
});

// Create an agent that summarizes Reddit posts
const redditSummarizer = cogentic.agent({
  tools: [webScraperTool],
  systemPrompt: `You are a Reddit post summarizer that helps people stay up to date with their favorite subreddits. 
Create clear, concise bullet-point summaries that capture the key insights from each post.`,
  model: "gpt-4-0-mini",
  options: {
    temperature: 0.7,
  },
});

// Run the agent
const result = await redditSummarizer.run(
  "Summarize the top 10 posts from r/buildinpublic"
);

console.log(result.data.response.posts);
```

## Built-in Tools

Cogentic comes with several built-in tools:

- `webScraperTool`: Fetch and parse web content
- `imageAnalyzerTool`: Analyze images using GPT-4 Vision

## Creating Custom Tools

You can create your own tools by implementing the `Tool` interface:

```typescript
import { Tool } from "@cogentic/core";

const myTool: Tool = {
  name: "my_tool",
  description: "Does something awesome",
  parameters: {
    param1: { type: "string", description: "First parameter" },
    param2: { type: "number", description: "Second parameter" },
  },
  run: async (params) => {
    // Your tool implementation here
    return { success: true, data: "Result" };
  },
};
```

## Debugging

Enable debug mode to see what your agent is doing:

```typescript
const result = await agent.run("Your prompt", { debug: true });
console.log(result.data.tools); // See what tools were used
console.log(result.data.thoughts); // See agent's reasoning
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT

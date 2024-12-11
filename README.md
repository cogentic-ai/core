# Cogentic AI TypeScript

A TypeScript implementation of the Cogentic AI framework.

## Installation

```bash
npm install cogentic-ai-typescript
# or
bun add cogentic-ai-typescript
```

## Configuration

There are two ways to configure the OpenAI API key:

1. Environment Variable:
   ```bash
   # In your .env file or environment
   OPENAI_API_KEY=your-api-key-here
   ```

2. Direct Configuration:
   ```typescript
   import { Agent } from 'cogentic-ai-typescript';

   const agent = new Agent({
     model: 'gpt-4o-mini',
     temperature: 0.7,
     apiKey: 'your-api-key-here' // Optional if OPENAI_API_KEY is set
   });
   ```

### Loading Environment Variables

If you're using environment variables, make sure to load them in your application:

```typescript
// Using dotenv
import * as dotenv from 'dotenv';
dotenv.config();

// Or using your framework's built-in env loading
// (Next.js, Remix, etc. handle this automatically)
```

## Usage

### Basic Chat

```typescript
const agent = new Agent({
  model: 'gpt-4o-mini',
  temperature: 0.7
});

try {
  const result = await agent.run('Hello, AI!');
  console.log(result.data);
  console.log('Cost:', result.cost);
} catch (error) {
  if (error instanceof AgentError) {
    console.error('Agent error:', error.message);
    if (error.cause) {
      console.error('Caused by:', error.cause);
    }
  }
}
```

### Streaming Responses

```typescript
const agent = new Agent({
  model: 'gpt-4o-mini',
  temperature: 0.7
});

// Using async iterator
for await (const chunk of agent.runStream('Tell me a story')) {
  process.stdout.write(chunk);
}
```

### Tool Calls

```typescript
const calculator = {
  name: 'calculator',
  description: 'Perform basic arithmetic operations',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide']
      },
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['operation', 'a', 'b']
  },
  func: async (args: any) => {
    switch (args.operation) {
      case 'add': return args.a + args.b;
      case 'subtract': return args.a - args.b;
      case 'multiply': return args.a * args.b;
      case 'divide': return args.a / args.b;
    }
  }
};

const agent = new Agent({
  model: 'gpt-4o-mini',
  temperature: 0.7,
  tools: [calculator]
});

const result = await agent.run('What is 5 + 3?');
console.log(result.data); // Output: 8
```

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Create a `.env` file:
   ```bash
   OPENAI_API_KEY=your-api-key-here
   ```
4. Run tests:
   ```bash
   bun test                # Run all tests
   bun test Agent.test.ts  # Run unit tests only
   bun test integration    # Run integration tests only
   bun test --timeout 30000 integration  # Run integration tests with longer timeout
   bun test:watch         # Watch mode
   ```

### Testing

The test suite is split into two parts:
- Unit tests (`Agent.test.ts`): Mock the OpenAI API to test core functionality
- Integration tests (`Agent.integration.test.ts`): Test with the real OpenAI API

Integration tests will be skipped if no API key is provided. When running integration tests, you may want to increase the timeout using the `--timeout` flag since they make real API calls.

### Error Handling

The Agent class provides detailed error information through the `AgentError` class:
- Missing API key
- Invalid responses
- Empty responses
- Tool execution errors

All errors include the original cause when available.

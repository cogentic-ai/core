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
     model: 'openai:gpt-4-mini',
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

```typescript
const agent = new Agent({
  model: 'openai:gpt-4-mini',
  temperature: 0.7
});

try {
  const response = await agent.chat('Hello, AI!');
  console.log(response);
} catch (error) {
  if (error instanceof AgentError) {
    console.error('Agent error:', error.message);
    if (error.cause) {
      console.error('Caused by:', error.cause);
    }
  }
}
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
   bun test
   # or watch mode
   bun test:watch
   ```

# Cogentic AI TypeScript

A TypeScript implementation of the Cogentic AI framework, providing type-safe interactions with AI models and runtime validation.

## Features

### Core Features (✓ Complete)
- ✓ Type-safe Agent implementation
- ✓ Runtime validation using Zod
- ✓ OpenAI integration
- ✓ Cost tracking and metrics
- ✓ System prompts
- ✓ Message history
- ✓ Error handling and retries
- ✓ Comprehensive test suite

### Tool Integration (⟳ In Progress)
- ✓ Basic tool registration and execution
- ✓ Tool call handling with OpenAI
- ⟳ Tool validation and type safety
- ⟳ Tool retry mechanisms
- Tool documentation generation (Coming soon)
- Tool dependency injection (Coming soon)

### Coming Soon
- Enhanced system prompts with templates
- Dynamic context management
- Provider abstraction layer
- Advanced cost tracking
- Logging system
- Response streaming improvements

## Installation

```bash
npm install cogentic-ai-typescript
# or
bun add cogentic-ai-typescript
```

## Basic Usage

### Simple Chat

```typescript
import { Agent } from 'cogentic-ai-typescript';

const agent = new Agent({
  model: 'gpt-4',
  apiKey: 'your-api-key-here' // Optional if OPENAI_API_KEY is set
});

const result = await agent.run('Hello, AI!');
console.log(result.data);
console.log('Cost:', result.cost);
```

### Structured Responses with Validation

```typescript
import { z } from 'zod';

const CitySchema = z.object({
  city: z.string(),
  country: z.string(),
  population: z.number()
});

const agent = new Agent({
  model: 'gpt-4',
  resultType: CitySchema
});

const result = await agent.run('Tell me about London');
console.log(result.data);
// Output: { city: 'London', country: 'UK', population: 8900000 }
```

### Tool Integration

```typescript
const calculator: Tool = {
  name: 'calculator',
  description: 'Perform basic arithmetic',
  parameters: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract'] },
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['operation', 'a', 'b']
  },
  func: async (args) => {
    switch (args.operation) {
      case 'add': return args.a + args.b;
      case 'subtract': return args.a - args.b;
    }
  }
};

const agent = new Agent({
  model: 'gpt-4',
  tools: [calculator]
});

const result = await agent.run('What is 5 + 3?');
console.log(result.data); // Output: 8
```

### Custom Validation

```typescript
const agent = new Agent({
  model: 'gpt-4'
});

agent.addResultValidator((result) => {
  if (typeof result !== 'string' || !result.includes('Hello')) {
    throw new Error('Response must include a greeting');
  }
  return result;
});

const result = await agent.run('Greet me');
```

## Error Handling

```typescript
try {
  const result = await agent.run('Hello!');
} catch (error) {
  if (error instanceof AgentError) {
    console.error('Agent error:', error.message);
    if (error.cause) {
      console.error('Caused by:', error.cause);
    }
  }
}
```

## Examples

### Hello World Example

The simplest way to get started is with our hello world example:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY='your-api-key-here'

# Run the hello world example
bun examples/hello-world.ts
```

This will demonstrate a basic interaction with the AI model. The example code can be found in `examples/hello-world.ts`.

### Running Tests

```bash
# Run unit tests (uses mocked responses)
bun test

# Run integration tests (requires OPENAI_API_KEY)
bun test test/integration --timeout 10000
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
   bun test                     # Run all tests
   bun test Agent.unit.test.ts  # Run unit tests
   bun test validation.test.ts  # Run validation tests
   bun test integration        # Run integration tests
   ```

### Testing Strategy

The test suite is organized into three parts:
- Unit tests: Core functionality with mocked OpenAI API
- Validation tests: Schema validation and type safety
- Integration tests: Real OpenAI API interaction

Integration tests require an API key and may take longer to run. Use the following for faster development:
```bash
bun test --watch Agent.unit.test.ts  # Watch unit tests
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for any new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

import { z } from 'zod';

export interface RunContext<TDeps = any> {
  deps: TDeps;
  retry: number;
  toolName?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parametersSchema?: z.ZodType<any>;
}

export interface ToolLifecycleHooks<TDeps, TParams, TResult> {
  prepare?: (ctx: RunContext<TDeps>) => Promise<ToolDefinition | null>;
  beforeExecute?: (ctx: RunContext<TDeps>, params: TParams) => Promise<void>;
  afterExecute?: (ctx: RunContext<TDeps>, params: TParams, result: TResult) => Promise<void>;
  onError?: (ctx: RunContext<TDeps>, params: TParams, error: Error) => Promise<TResult | void>;
}

export interface Tool<TDeps = any, TParams = any, TResult = any> 
  extends ToolDefinition, ToolLifecycleHooks<TDeps, TParams, TResult> {
  fn: (ctx: RunContext<TDeps>, params: TParams) => Promise<TResult>;
  maxRetries?: number;
}

export class ToolExecutor<TDeps, TParams, TResult> {
  constructor(private tool: Tool<TDeps, TParams, TResult>) {}

  async execute(ctx: RunContext<TDeps>, params: TParams): Promise<TResult> {
    try {
      // Validate parameters if schema exists
      if (this.tool.parametersSchema) {
        this.tool.parametersSchema.parse(params);
      }

      // Run prepare hook
      if (this.tool.prepare) {
        const definition = await this.tool.prepare(ctx);
        if (!definition) {
          throw new Error('Tool preparation failed');
        }
      }

      // Run before execute hook
      if (this.tool.beforeExecute) {
        await this.tool.beforeExecute(ctx, params);
      }

      // Execute the tool
      const result = await this.tool.fn(ctx, params);

      // Run after execute hook
      if (this.tool.afterExecute) {
        await this.tool.afterExecute(ctx, params, result);
      }

      return result;
    } catch (error) {
      // Run error hook if it exists
      if (this.tool.onError) {
        const recovery = await this.tool.onError(ctx, params, error as Error);
        if (recovery !== undefined) {
          return recovery;
        }
      }
      throw error;
    }
  }
}

export interface OpenAIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export function generateOpenAISchema(tool: Tool): OpenAIFunctionDefinition {
  if (!tool.parametersSchema) {
    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: {}
      }
    };
  }

  const schema = tool.parametersSchema;
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('Tool parameters schema must be a Zod object');
  }

  const { properties, required } = zodToJsonSchema(schema);
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties,
      ...(required && required.length > 0 ? { required } : {})
    }
  };
}

interface JsonSchemaWithRequired {
  type: string;
  properties?: Record<string, any>;
  items?: any;
  enum?: any[];
  required?: string[];
}

function zodToJsonSchema(schema: z.ZodType<any>): JsonSchemaWithRequired {
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element)
    };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = zodToJsonSchema(value);
      properties[key] = fieldSchema;
      
      // Only mark as required if it's not optional or has a default
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {})
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values
    };
  }
  if (schema instanceof z.ZodDefault) {
    return zodToJsonSchema(schema._def.innerType);
  }

  throw new Error(`Unsupported Zod schema type: ${schema.constructor.name}`);
}

import { z } from "zod";

/**
 * Validates that a string is valid JSON and returns it.
 * If the string is not valid JSON, wraps it in an object with a 'value' property.
 */
export function validateAndFormatJSON(content: string): string {
  try {
    JSON.parse(content);
    return content;
  } catch {
    return JSON.stringify({ value: content });
  }
}

/**
 * Safely parses JSON, returning undefined if parsing fails
 */
export function safeJSONParse(content: string): any | undefined {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

/**
 * Convert a Zod schema to a JSON Schema object
 */
export function zodToJson(schema: z.ZodType): object {
  if (!schema) return {};

  // Handle object schemas
  if (schema instanceof z.ZodObject) {
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(schema.shape).map(([key, value]) => [
          key,
          zodToJson(value as z.ZodType),
        ])
      ),
      required: Object.keys(schema.shape),
    };
  }

  // Handle string schema
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }

  // Handle number schema
  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }

  // Handle boolean schema
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  // Handle array schema
  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      items: zodToJson(schema.element),
    };
  }

  // Handle enum schema
  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: schema._def.values,
    };
  }

  // Handle literal schema
  if (schema instanceof z.ZodLiteral) {
    return {
      type: typeof schema._def.value,
      enum: [schema._def.value],
    };
  }

  // Handle union schema
  if (schema instanceof z.ZodUnion) {
    return {
      oneOf: schema._def.options.map((option: z.ZodType) => zodToJson(option)),
    };
  }

  // Default to any type if schema type is not recognized
  return { type: "any" };
}

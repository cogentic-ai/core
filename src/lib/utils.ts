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
 * Convert a Zod schema into a plain JSON object showing its shape
 */
export function zodToJson(schema: z.ZodType): object {
  if (!schema) return {};
  
  // Handle object schemas
  if (schema instanceof z.ZodObject) {
    return Object.fromEntries(
      Object.entries(schema.shape).map(([key, field]) => [
        key,
        {
          type: (field as any)._def.typeName,
          description: (field as any).description,
        },
      ])
    );
  }
  
  // Handle single field schemas
  return {
    type: (schema as any)._def.typeName,
    description: (schema as any).description,
  };
}

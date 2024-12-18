import { z } from "zod";

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

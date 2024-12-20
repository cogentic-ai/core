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
 * Convert a Zod schema into an OpenAI-compatible JSON Schema object
 */
export function zodToJson(schema: z.ZodType): object {
  if (!schema) return { type: "object", properties: {} };

  // Handle object schemas
  if (schema instanceof z.ZodObject) {
    const properties = Object.fromEntries(
      Object.entries(schema.shape as Record<string, z.ZodType>).map(([key, field]) => [
        key,
        zodTypeToJsonSchema(field),
      ])
    );
    return {
      type: "object",
      properties,
      required: Object.keys(schema.shape).filter(
        (k) => {
          const field = schema.shape[k] as z.ZodType;
          return !(field instanceof z.ZodOptional);
        }
      ),
    };
  }

  return zodTypeToJsonSchema(schema);
}

function zodTypeToJsonSchema(schema: z.ZodType): object {
  if (!schema) return { type: "null" };

  const def = (schema as any)._def;

  switch (def.typeName) {
    case "ZodString":
      return { type: "string", description: schema.description };
    case "ZodNumber":
      return { type: "number", description: schema.description };
    case "ZodBoolean":
      return { type: "boolean", description: schema.description };
    case "ZodArray":
      return {
        type: "array",
        items: zodTypeToJsonSchema(def.type),
        description: schema.description,
      };
    case "ZodEnum":
      return {
        type: "string",
        enum: def.values,
        description: schema.description,
      };
    case "ZodUnion":
      return {
        oneOf: def.options.map(zodTypeToJsonSchema),
        description: schema.description,
      };
    case "ZodOptional":
      return zodTypeToJsonSchema(def.innerType);
    default:
      return { type: "object", description: schema.description };
  }
}

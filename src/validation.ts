import { z } from "zod";

/**
 * Type for validation errors that may occur during result processing
 */
export interface ValidationError {
  code: "validation_error";
  message: string;
  errors: z.ZodError;
}

/**
 * Internal validation helper
 */
async function validateResult<T>(
  value: unknown,
  schema: z.ZodType<T>
): Promise<T | ValidationError> {
  try {
    return await schema.parseAsync(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        code: "validation_error",
        message: "Validation failed",
        errors: error,
      };
    }
    throw error;
  }
}

/**
 * Helper to create a schema for tool parameters
 * This helps generate proper JSON Schema for LLM function calling
 */
export function createToolSchema<T extends z.ZodType>(
  schema: T,
  description: string
): z.ZodType<z.infer<T>> {
  return schema.describe(description);
}

// Common schema patterns
export const Schema = {
  // For handling both structured and text responses
  textOr: <T>(schema: z.ZodType<T>) =>
    z.union([z.string(), schema]),

  // For handling multiple possible structured responses
  union: <T extends z.ZodType[]>(...schemas: T) =>
    z.union(schemas),

  // For wrapping primitive types in an object (as required by OpenAI)
  wrap: <T>(schema: z.ZodType<T>, name: string = "value") =>
    z.object({ [name]: schema }),
} as const;

// Type helper for extracting the type from a Zod schema
export type Infer<T extends z.ZodType> = z.infer<T>;

/**
 * Example usage:
 * 
 * const CityLocation = z.object({
 *   city: z.string(),
 *   country: z.string(),
 * });
 * 
 * const agent = new Agent({
 *   model: "gpt-4",
 *   resultType: CityLocation,  // Just pass the schema directly
 * });
 * 
 * // The result will be type-safe and validated
 * const result = await agent.run("Where was the 2012 Olympics?");
 * console.log(result.data.city); // TypeScript knows this exists
 */

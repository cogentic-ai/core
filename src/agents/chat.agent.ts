import { openai } from "../lib/openai";

export async function chat(message: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });

    return {
      success: true,
      response: completion.choices[0]?.message?.content || "No response generated"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

import { openai } from "../lib/openai";

const INPUT_COST_PER_TOKEN = 0.15 / 1_000_000; // $0.15 per 1M tokens
const OUTPUT_COST_PER_TOKEN = 0.6 / 1_000_000; // $0.60 per 1M tokens

export interface ChatResponse {
  message: string;
  costs: {
    inputCost: string;
    outputCost: string;
    totalCost: string;
  };
}

export async function chat(message: string): Promise<ChatResponse> {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: message }],
    model: "gpt-4o-mini",
  });

  const response = completion.choices[0]?.message?.content || "";
  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;

  const inputCost = (inputTokens * INPUT_COST_PER_TOKEN).toFixed(2);
  const outputCost = (outputTokens * OUTPUT_COST_PER_TOKEN).toFixed(2);
  const totalCost = (Number(inputCost) + Number(outputCost)).toFixed(2);

  return {
    message: response,
    costs: {
      inputCost: `$${inputCost}`,
      outputCost: `$${outputCost}`,
      totalCost: `$${totalCost}`,
    },
  };
}

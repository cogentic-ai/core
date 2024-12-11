interface ModelPricing {
  inputTokenPrice: number;  // Price per 1M input tokens
  outputTokenPrice: number; // Price per 1M output tokens
}

interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

const MODEL_PRICES: Record<string, ModelPricing> = {
  'gpt-4o-mini': {
    inputTokenPrice: 0.150,  // $0.150 per 1M input tokens
    outputTokenPrice: 0.600, // $0.600 per 1M output tokens
  },
};

/**
 * Calculate the cost for a specific model's API usage
 * @param model The model name (e.g., 'gpt-4o-mini')
 * @param inputTokens Number of input tokens used
 * @param outputTokens Number of output tokens used
 * @returns Cost breakdown including input, output, and total costs in dollars
 * @throws Error if model pricing is not found
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): CostBreakdown {
  const pricing = MODEL_PRICES[model];
  if (!pricing) {
    throw new Error(`Pricing not found for model: ${model}`);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputTokenPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputTokenPrice;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export const SUPPORTED_MODELS = Object.keys(MODEL_PRICES);

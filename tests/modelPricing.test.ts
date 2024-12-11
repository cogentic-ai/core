import { expect, test, describe } from "bun:test";
import { calculateCost } from "../src/modelPricing";

describe("Model Pricing", () => {
  test("should calculate costs correctly for gpt-4o-mini", () => {
    const costs = calculateCost("gpt-4o-mini", 100, 50);
    
    // Expected costs:
    // Input: 100 tokens * ($0.150 / 1M tokens) = $0.0000150
    // Output: 50 tokens * ($0.600 / 1M tokens) = $0.0000300
    // Total: $0.0000450
    
    expect(costs.inputCost).toBe(0.0000150);
    expect(costs.outputCost).toBe(0.0000300);
    expect(costs.totalCost).toBe(0.0000450);
  });

  test("should handle large token counts", () => {
    const costs = calculateCost("gpt-4o-mini", 1_000_000, 500_000);
    
    // Expected costs:
    // Input: 1M tokens * ($0.150 / 1M tokens) = $0.150
    // Output: 500K tokens * ($0.600 / 1M tokens) = $0.300
    // Total: $0.450
    
    expect(costs.inputCost).toBeCloseTo(0.150, 5);
    expect(costs.outputCost).toBeCloseTo(0.300, 5);
    expect(costs.totalCost).toBeCloseTo(0.450, 5);
  });

  test("should throw error for unknown model", () => {
    expect(() => calculateCost("unknown-model", 100, 50)).toThrow(
      "Pricing not found for model: unknown-model"
    );
  });
});

import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { Schema } from "../src/validation";

describe("Validation System", () => {
  // Test basic schema
  it("should validate a simple schema", () => {
    const CityLocation = z.object({
      city: z.string(),
      country: z.string(),
    });

    const goodData = { city: "London", country: "UK" };
    const badData = { city: "London" }; // missing country

    const result = CityLocation.safeParse(goodData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("London");
    }

    const error = CityLocation.safeParse(badData);
    expect(error.success).toBe(false);
  });

  // Test union types
  it("should handle union types correctly", () => {
    const StringOrNumber = Schema.textOr(z.number());
    const result = StringOrNumber.safeParse("hello");
    expect(result.success).toBe(true);

    const numResult = StringOrNumber.safeParse(42);
    expect(numResult.success).toBe(true);

    const badResult = StringOrNumber.safeParse({});
    expect(badResult.success).toBe(false);
  });

  // Test multiple response types
  it("should handle multiple response types", () => {
    const ProfileSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const LocationSchema = z.object({
      latitude: z.number(),
      longitude: z.number(),
    });

    const MultiResponse = Schema.union(ProfileSchema, LocationSchema);
    
    const profile = { name: "John", age: 30 };
    const location = { latitude: 51.5074, longitude: -0.1278 };
    
    expect(MultiResponse.safeParse(profile).success).toBe(true);
    expect(MultiResponse.safeParse(location).success).toBe(true);
    expect(MultiResponse.safeParse({ name: "John" }).success).toBe(false);
  });

  // Test primitive wrapping
  it("should wrap primitives in objects", () => {
    const WrappedNumber = Schema.wrap(z.number(), "count");
    const result = WrappedNumber.safeParse({ count: 42 });
    expect(result.success).toBe(true);
    
    const badResult = WrappedNumber.safeParse(42);
    expect(badResult.success).toBe(false);
  });
});

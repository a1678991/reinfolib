import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env.REINFOLIB_API_KEY;
const runIt = process.env.INTEGRATION === "1" && apiKey ? it : it.skip;

describe("XIT001 — live", () => {
  runIt(
    "hits the real endpoint and parses the response",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.prices.transactionPoints({
        year: "2024",
        quarter: "2",
        city: "13102",
        language: "en",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBeDefined();
        expect(Array.isArray(res.data.data)).toBe(true);
      }
    },
    30_000,
  );
});

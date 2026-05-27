import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XIT002 — live", () => {
  runIt(
    "hits the real endpoint and parses the municipality list",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.municipalities.list({ area: "13", language: "en" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBeDefined();
        expect(Array.isArray(res.data.data)).toBe(true);
        expect(res.data.data.length).toBeGreaterThan(0);
      }
    },
    30_000,
  );
});

import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XPT002 — live", () => {
  runIt(
    "GeoJSON: hits the real endpoint and parses",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.prices.landPriceTiles({
        z: 14,
        x: 14552,
        y: 6451,
        year: "2024",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.type).toBe("FeatureCollection");
        expect(Array.isArray(res.data.features)).toBe(true);
      }
    },
    30_000,
  );

  runIt(
    "PBF: hits the real endpoint and returns Uint8Array",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.prices.landPriceTiles(
        { z: 14, x: 14552, y: 6451, year: "2024" },
        { format: "pbf" },
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toBeInstanceOf(Uint8Array);
        expect(res.data.byteLength).toBeGreaterThan(0);
      }
    },
    30_000,
  );
});

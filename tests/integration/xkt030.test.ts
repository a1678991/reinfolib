import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XKT030 — live", () => {
  runIt(
    "GeoJSON: hits the real endpoint and parses",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.urbanPlanning.plannedRoads({ z: 11, x: 1828, y: 751 });
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
      const res = await client.urbanPlanning.plannedRoads(
        { z: 11, x: 1828, y: 751 },
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

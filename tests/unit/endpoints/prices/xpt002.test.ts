import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xpt002.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xpt002.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xpt002.pbf"));

describe("XPT002 params schema", () => {
  const base = { z: 14, x: 14552, y: 6451, year: "2024" };

  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse(base).success).toBe(true);
  });

  it("rejects zoom outside 13..15", () => {
    expect(paramsSchema.safeParse({ ...base, z: 12 }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, z: 16 }).success).toBe(false);
  });

  it("accepts priceClassification 0 / 1", () => {
    expect(paramsSchema.safeParse({ ...base, priceClassification: "0" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "1" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "2" }).success).toBe(false);
  });

  it("validates useCategoryCode values", () => {
    expect(paramsSchema.safeParse({ ...base, useCategoryCode: "00" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, useCategoryCode: "00,03,05" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, useCategoryCode: "99" }).success).toBe(false);
  });

  it("rejects year outside 1995..2024", () => {
    expect(paramsSchema.safeParse({ ...base, year: "1994" }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, year: "2025" }).success).toBe(false);
  });
});

describe("XPT002 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XPT002 call() — GeoJSON", () => {
  it("returns ok with parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451, year: "2024" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("sends correct query params", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451, year: "2024" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
    expect(url).toContain("year=2024");
  });
});

describe("XPT002 call() — PBF", () => {
  it("returns ok with Uint8Array", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451, year: "2024" }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toBeInstanceOf(Uint8Array);
      expect(res.data.byteLength).toBe(pbfFixture.byteLength);
    }
  });
});

describe("ReinfolibClient.prices.landPriceTiles", () => {
  it("is wired (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.landPriceTiles({ z: 14, x: 14552, y: 6451, year: "2024" });
    expect(res.ok).toBe(true);
  });

  it("is wired (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.landPriceTiles(
      { z: 14, x: 14552, y: 6451, year: "2024" },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});

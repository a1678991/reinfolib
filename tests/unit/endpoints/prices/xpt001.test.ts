import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xpt001.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xpt001.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xpt001.pbf"));

describe("XPT001 params schema", () => {
  const base = { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" };

  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse(base).success).toBe(true);
  });

  it("rejects zoom outside 11..15", () => {
    expect(paramsSchema.safeParse({ ...base, z: 10 }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, z: 16 }).success).toBe(false);
  });

  it("accepts priceClassification 01/02", () => {
    expect(paramsSchema.safeParse({ ...base, priceClassification: "01" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "02" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "03" }).success).toBe(false);
  });

  it("validates landTypeCode is one of allowed values", () => {
    for (const c of ["01", "02", "07", "10", "11"]) {
      expect(paramsSchema.safeParse({ ...base, landTypeCode: c }).success).toBe(true);
    }
    expect(paramsSchema.safeParse({ ...base, landTypeCode: "99" }).success).toBe(false);
  });

  it("rejects bad from/to format", () => {
    expect(paramsSchema.safeParse({ ...base, from: "2024" }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, from: "20245" }).success).toBe(false);
  });
});

describe("XPT001 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XPT001 call() — GeoJSON", () => {
  it("returns ok with parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("sends response_format=geojson", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
    expect(url).toContain("from=20241");
    expect(url).toContain("to=20244");
  });
});

describe("XPT001 call() — PBF", () => {
  it("returns ok with Uint8Array when format=pbf", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(
      client,
      { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toBeInstanceOf(Uint8Array);
      expect(res.data.byteLength).toBe(pbfFixture.byteLength);
    }
  });
});

describe("ReinfolibClient.prices.priceTiles", () => {
  it("is wired (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.priceTiles({
      z: 14,
      x: 14552,
      y: 6451,
      from: "20241",
      to: "20244",
    });
    expect(res.ok).toBe(true);
  });

  it("is wired (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.priceTiles(
      { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});

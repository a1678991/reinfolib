import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import {
  paramsSchema,
  responseSchema,
  call,
} from "../../../../src/endpoints/urban-planning/xkt001.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xkt001.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xkt001.pbf"));

describe("XKT001 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ z: 14, x: 14552, y: 6451 }).success).toBe(true);
  });

  it("rejects zoom < 11 or > 15", () => {
    expect(paramsSchema.safeParse({ z: 10, x: 1, y: 1 }).success).toBe(false);
    expect(paramsSchema.safeParse({ z: 16, x: 1, y: 1 }).success).toBe(false);
  });

  it("rejects negative tile coords", () => {
    expect(paramsSchema.safeParse({ z: 14, x: -1, y: 0 }).success).toBe(false);
    expect(paramsSchema.safeParse({ z: 14, x: 0, y: -1 }).success).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(paramsSchema.safeParse({ z: 14.5, x: 1, y: 1 }).success).toBe(false);
    expect(paramsSchema.safeParse({ z: 14, x: 1.5, y: 1 }).success).toBe(false);
  });
});

describe("XKT001 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XKT001 call() — GeoJSON", () => {
  it("returns ok with parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("sends response_format=geojson in the query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451 });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
    expect(url).toContain("z=14");
    expect(url).toContain("x=14552");
    expect(url).toContain("y=6451");
  });
});

describe("XKT001 call() — PBF", () => {
  it("returns ok with Uint8Array when format=pbf", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toBeInstanceOf(Uint8Array);
      expect(res.data.byteLength).toBe(pbfFixture.byteLength);
    }
  });

  it("sends response_format=pbf in the query string", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=pbf");
  });
});

describe("ReinfolibClient.urbanPlanning.zoning", () => {
  it("is wired and delegates to XKT001 call() (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.zoning({ z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
  });

  it("is wired and delegates to XKT001 call() (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.zoning({ z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});

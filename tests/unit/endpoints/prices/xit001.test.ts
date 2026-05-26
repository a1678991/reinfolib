import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xit001.js";

const fixture = JSON.parse(readFileSync(resolve("tests/fixtures/xit001.json"), "utf8"));

describe("XIT001 params schema", () => {
  it("accepts a minimal valid request (city only)", () => {
    const r = paramsSchema.safeParse({ year: "2024", quarter: "2", city: "13102" });
    expect(r.success).toBe(true);
  });

  it("requires at least one of area/city/station", () => {
    const r = paramsSchema.safeParse({ year: "2024", quarter: "2" });
    expect(r.success).toBe(false);
  });

  it("rejects bad year", () => {
    expect(paramsSchema.safeParse({ year: "2004", quarter: "2", city: "13102" }).success).toBe(
      false,
    );
    expect(paramsSchema.safeParse({ year: "24", quarter: "2", city: "13102" }).success).toBe(false);
  });

  it("accepts priceClassification 01 or 02", () => {
    expect(
      paramsSchema.safeParse({
        year: "2024",
        quarter: "2",
        city: "13102",
        priceClassification: "01",
      }).success,
    ).toBe(true);
    expect(
      paramsSchema.safeParse({
        year: "2024",
        quarter: "2",
        city: "13102",
        priceClassification: "03",
      }).success,
    ).toBe(false);
  });

  it("accepts comma-separated area codes", () => {
    expect(paramsSchema.safeParse({ year: "2024", quarter: "2", area: "13,14" }).success).toBe(
      true,
    );
    expect(paramsSchema.safeParse({ year: "2024", quarter: "2", area: "13,abc" }).success).toBe(
      false,
    );
  });
});

describe("XIT001 response schema", () => {
  it("parses the captured fixture", () => {
    const r = responseSchema.safeParse(fixture);
    expect(
      r.success,
      r.success ? "" : JSON.stringify((r as { error: { issues: unknown } }).error.issues),
    ).toBe(true);
  });
});

describe("XIT001 call()", () => {
  it("returns ok with parsed data", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { year: "2024", quarter: "2", city: "13102" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.status).toBe(fixture.status);
  });

  it("sends correct query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { year: "2024", quarter: "2", city: "13102", priceClassification: "01" });
    const callArgs = fetchFn.mock.calls[0] as unknown as [string, RequestInit?];
    const url = String(callArgs[0]);
    expect(url).toContain("year=2024");
    expect(url).toContain("quarter=2");
    expect(url).toContain("city=13102");
    expect(url).toContain("priceClassification=01");
  });
});

describe("ReinfolibClient.prices.transactionPoints", () => {
  it("is wired and delegates to XIT001 call()", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.transactionPoints({
      year: "2024",
      quarter: "2",
      city: "13102",
    });
    expect(res.ok).toBe(true);
  });
});

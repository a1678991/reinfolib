import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xct001.js";

const fixture = JSON.parse(readFileSync(resolve("tests/fixtures/xct001.json"), "utf8"));

describe("XCT001 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ year: "2025", area: "13", division: "00" }).success).toBe(true);
  });

  it("rejects year out of 2022..2026", () => {
    expect(paramsSchema.safeParse({ year: "2021", area: "13", division: "00" }).success).toBe(
      false,
    );
    expect(paramsSchema.safeParse({ year: "2027", area: "13", division: "00" }).success).toBe(
      false,
    );
  });

  it("rejects invalid area", () => {
    expect(paramsSchema.safeParse({ year: "2025", area: "1", division: "00" }).success).toBe(false);
    expect(paramsSchema.safeParse({ year: "2025", area: "ab", division: "00" }).success).toBe(
      false,
    );
  });

  it("accepts only allowed divisions", () => {
    for (const d of ["00", "03", "05", "07", "09", "10", "13", "20"]) {
      expect(paramsSchema.safeParse({ year: "2025", area: "13", division: d }).success).toBe(true);
    }
    expect(paramsSchema.safeParse({ year: "2025", area: "13", division: "01" }).success).toBe(
      false,
    );
  });

  it("accepts comma-separated area codes", () => {
    expect(paramsSchema.safeParse({ year: "2025", area: "13,14", division: "00" }).success).toBe(
      true,
    );
    expect(paramsSchema.safeParse({ year: "2025", area: "13,abc", division: "00" }).success).toBe(
      false,
    );
  });
});

describe("XCT001 response schema", () => {
  it("parses the captured fixture", () => {
    const r = responseSchema.safeParse(fixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XCT001 call()", () => {
  it("returns ok with parsed data", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { year: "2025", area: "13", division: "00" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.status).toBe(fixture.status);
  });

  it("sends correct query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { year: "2025", area: "13", division: "00" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("year=2025");
    expect(url).toContain("area=13");
    expect(url).toContain("division=00");
  });
});

describe("ReinfolibClient.prices.appraisals", () => {
  it("is wired and delegates to XCT001 call()", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.appraisals({ year: "2025", area: "13", division: "00" });
    expect(res.ok).toBe(true);
  });
});

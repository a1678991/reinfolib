import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import {
  paramsSchema,
  responseSchema,
  call,
} from "../../../../src/endpoints/municipalities/xit002.js";

const fixture = JSON.parse(readFileSync(resolve("tests/fixtures/xit002.json"), "utf8"));

describe("XIT002 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ area: "13" }).success).toBe(true);
    expect(paramsSchema.safeParse({ area: "13", language: "en" }).success).toBe(true);
    expect(paramsSchema.safeParse({ area: "13", language: "ja" }).success).toBe(true);
  });

  it("rejects invalid area", () => {
    expect(paramsSchema.safeParse({ area: "1" }).success).toBe(false);
    expect(paramsSchema.safeParse({ area: "abc" }).success).toBe(false);
  });

  it("rejects invalid language", () => {
    expect(paramsSchema.safeParse({ area: "13", language: "fr" }).success).toBe(false);
  });
});

describe("XIT002 response schema", () => {
  it("parses the captured fixture", () => {
    const r = responseSchema.safeParse(fixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XIT002 call()", () => {
  it("returns ok with parsed data envelope", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { area: "13" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe(fixture.status);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThan(0);
    }
  });

  it("sends correct query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { area: "13", language: "en" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("area=13");
    expect(url).toContain("language=en");
  });
});

describe("ReinfolibClient.municipalities.list", () => {
  it("is wired and delegates to XIT002 call()", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.municipalities.list({ area: "13" });
    expect(res.ok).toBe(true);
  });
});

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { request, callGis, type RequestArgs } from "../../../src/core/request.js";
import { TokenBucket } from "../../../src/core/rate-limit.js";
import { DEFAULT_RETRY } from "../../../src/core/retry.js";

const paramsSchema = z.object({ year: z.number().int() });
const responseSchema = z.object({ ok: z.literal(true), n: z.number() });

function buildArgs(
  overrides: Partial<RequestArgs<{ year: number }, { ok: true; n: number }>> = {},
) {
  return {
    apiKey: "test-key",
    baseUrl: "https://example.test",
    path: "/x",
    params: { year: 2024 },
    paramsSchema,
    responseSchema,
    bucket: new TokenBucket({ capacity: 100, refillPerSecond: 100 }),
    retry: { ...DEFAULT_RETRY, baseDelayMs: 1, maxDelayMs: 5, maxAttempts: 3 },
    timeoutMs: 5_000,
    fetch: vi.fn(),
    ...overrides,
  } as RequestArgs<{ year: number }, { ok: true; n: number }>;
}

describe("request", () => {
  it("returns ok with parsed data on 200", async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ ok: true, n: 42 }), { status: 200 }),
    );
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ ok: true, n: 42 });
  });

  it("sets the Ocp-Apim-Subscription-Key header", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, n: 1 })));
    const args = buildArgs({ fetch: fetchFn });
    await request(args);
    const call = (fetchFn.mock.calls as unknown as [string, RequestInit?][])[0]!;
    const headers = new Headers(call[1]?.headers);
    expect(headers.get("Ocp-Apim-Subscription-Key")).toBe("test-key");
  });

  it("sends Accept: application/json by default", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, n: 1 })));
    const args = buildArgs({ fetch: fetchFn });
    await request(args);
    const call = (fetchFn.mock.calls as unknown as [string, RequestInit?][])[0]!;
    const headers = new Headers(call[1]?.headers);
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("sends Accept: application/octet-stream when responseKind=binary", async () => {
    const bytes = new Uint8Array([0x01]);
    const fetchFn = vi.fn(async () => new Response(bytes, { status: 200 }));
    const args = buildArgs({ fetch: fetchFn });
    const binaryArgs = { ...args, responseKind: "binary" as const };
    await request(binaryArgs as unknown as Parameters<typeof request>[0]);
    const call = (fetchFn.mock.calls as unknown as [string, RequestInit?][])[0]!;
    const headers = new Headers(call[1]?.headers);
    expect(headers.get("Accept")).toBe("application/octet-stream");
  });

  it("encodes params as query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, n: 1 })));
    const args = buildArgs({ fetch: fetchFn, params: { year: 2024 } });
    await request(args);
    const call = (fetchFn.mock.calls as unknown as [string, RequestInit?][])[0]!;
    expect(String(call[0])).toBe("https://example.test/x?year=2024");
  });

  it("returns validation err on bad params (no fetch)", async () => {
    const fetchFn = vi.fn();
    const args = buildArgs({
      fetch: fetchFn,
      params: { year: "not a number" } as unknown as { year: number },
    });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("validation");
      if (r.error.kind === "validation") expect(r.error.phase).toBe("params");
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns validation err on bad response shape", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, n: "string!" })));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("validation");
      if (r.error.kind === "validation") expect(r.error.phase).toBe("response");
    }
  });

  it("returns api err on 4xx without retry", async () => {
    const fetchFn = vi.fn(async () => new Response("bad", { status: 400 }));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === "api") {
      expect(r.error.status).toBe(400);
      expect(r.error.attempts).toBe(1);
    }
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries on 503 up to maxAttempts then returns api err", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 503 }));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === "api") {
      expect(r.error.status).toBe(503);
      expect(r.error.attempts).toBe(3);
    }
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("retries 503 then succeeds on second attempt", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, n: 7 })));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as { ok: true; n: number }).n).toBe(7);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("returns network err with attempts on fetch reject", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("connection reset");
    });
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === "network") {
      expect(r.error.attempts).toBe(3);
    }
  });

  it("returns aborted on caller signal", async () => {
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
      });
    });
    const ac = new AbortController();
    const args = buildArgs({ fetch: fetchFn, signal: ac.signal });
    const p = request(args);
    queueMicrotask(() => ac.abort(new Error("user cancel")));
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("aborted");
  });

  it("returns aborted when caller signal fires during backoff", async () => {
    // First response is a 503 — request will retry after backoff.
    // We abort during the sleep, so the sleep promise rejects with the signal reason.
    // request() must catch this and return err({kind:"aborted"}), not throw.
    const fetchFn = vi.fn().mockResolvedValueOnce(new Response("nope", { status: 503 }));
    const ac = new AbortController();
    const args = buildArgs({
      fetch: fetchFn,
      signal: ac.signal,
      retry: {
        ...DEFAULT_RETRY,
        baseDelayMs: 200,
        maxDelayMs: 1000,
        maxAttempts: 3,
        jitter: "none",
      },
    });
    const p = request(args);
    // First call resolves with 503; then request enters sleep(200ms). Abort during that.
    setTimeout(() => ac.abort(new Error("cancel during backoff")), 50);
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("aborted");
  });
});

describe("request — binary response", () => {
  it("returns ok with Uint8Array when responseKind=binary", async () => {
    const bytes = new Uint8Array([0x1a, 0x2b, 0x3c, 0x4d]);
    const fetchFn = vi.fn(async () => new Response(bytes, { status: 200 }));
    const args = buildArgs({ fetch: fetchFn });
    const binaryArgs = { ...args, responseKind: "binary" as const };
    const r = await request(binaryArgs as unknown as Parameters<typeof request>[0]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeInstanceOf(Uint8Array);
      expect(Array.from(r.data as Uint8Array)).toEqual([0x1a, 0x2b, 0x3c, 0x4d]);
    }
  });

  it("does not invoke responseSchema for binary responses", async () => {
    const bytes = new Uint8Array([0xff]);
    const fetchFn = vi.fn(async () => new Response(bytes, { status: 200 }));
    const spySchema = z.object({ never: z.literal(true) });
    const safeParse = vi.spyOn(spySchema, "safeParse");
    const args = buildArgs({
      fetch: fetchFn,
      responseSchema: spySchema as unknown as typeof responseSchema,
    });
    const binaryArgs = { ...args, responseKind: "binary" as const };
    await request(binaryArgs as unknown as Parameters<typeof request>[0]);
    expect(safeParse).not.toHaveBeenCalled();
  });

  it("retries on 5xx for binary path too", async () => {
    const bytes = new Uint8Array([0xab]);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(new Response(bytes, { status: 200 }));
    const args = buildArgs({ fetch: fetchFn });
    const binaryArgs = { ...args, responseKind: "binary" as const };
    const r = await request(binaryArgs as unknown as Parameters<typeof request>[0]);
    expect(r.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("callGis", () => {
  const userParams = z.object({ z: z.number().int(), x: z.number().int(), y: z.number().int() });
  const propsSchema = z.object({ name: z.string() });
  const fcSchema = z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        geometry: z.object({
          type: z.literal("Point"),
          coordinates: z.tuple([z.number(), z.number()]),
        }),
        properties: propsSchema,
      }),
    ),
  });
  const sampleFc = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [0, 0] as [number, number] },
        properties: { name: "origin" },
      },
    ],
  };

  function buildClientStub(fetchFn: typeof globalThis.fetch) {
    return {
      apiKey: "k",
      baseUrl: "https://example.test",
      timeoutMs: 5_000,
      userAgent: undefined,
      bucket: undefined,
      retry: { ...DEFAULT_RETRY, baseDelayMs: 1, maxDelayMs: 5, maxAttempts: 3 },
      fetch: fetchFn,
    };
  }

  it("defaults to geojson and returns parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(sampleFc), { status: 200 }));
    const client = buildClientStub(fetchFn);
    const res = await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: {},
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(sampleFc);
  });

  it("appends response_format=geojson to the query string by default", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(sampleFc), { status: 200 }));
    const client = buildClientStub(fetchFn);
    await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: {},
    });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
  });

  it("returns Uint8Array when opts.format=pbf", async () => {
    const bytes = new Uint8Array([0xab, 0xcd]);
    const fetchFn = vi.fn(async () => new Response(bytes, { status: 200 }));
    const client = buildClientStub(fetchFn);
    const res = await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: { format: "pbf" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=pbf");
  });

  it("merges per-call retry override", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(new Response("nope", { status: 503 }));
    const client = buildClientStub(fetchFn);
    const res = await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: { retry: { maxAttempts: 2 } },
    });
    expect(res.ok).toBe(false);
    if (!res.ok && res.error.kind === "api") expect(res.error.attempts).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

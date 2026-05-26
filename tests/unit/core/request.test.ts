import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { request, type RequestArgs } from "../../../src/core/request.js";
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
    if (r.ok) expect(r.data.n).toBe(7);
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
});

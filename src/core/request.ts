import type { ZodType } from "zod";
import type { ReinfolibError } from "./errors.js";
import { err, ok, type Result } from "./result.js";
import type { TokenBucket } from "./rate-limit.js";
import { computeBackoffMs, shouldRetryStatus, sleep, type RetryConfig } from "./retry.js";

export type RequestArgs<P, R> = {
  apiKey: string;
  baseUrl: string;
  path: string;
  params: P;
  paramsSchema: ZodType<P>;
  responseSchema: ZodType<R>;
  bucket: TokenBucket | undefined;
  retry: RetryConfig;
  timeoutMs: number;
  signal?: AbortSignal | undefined;
  fetch: typeof globalThis.fetch;
  userAgent?: string | undefined;
};

function buildUrl(baseUrl: string, path: string, params: Record<string, unknown>): string {
  const u = new URL(path, baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function isAbortError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: string }).name === "AbortError";
}

export async function request<P, R>(a: RequestArgs<P, R>): Promise<Result<R, ReinfolibError>> {
  // Phase 1: params validation
  const parsedParams = a.paramsSchema.safeParse(a.params);
  if (!parsedParams.success) {
    return err({ kind: "validation", phase: "params", issues: parsedParams.error.issues });
  }

  const url = buildUrl(a.baseUrl, a.path, parsedParams.data as Record<string, unknown>);
  const maxAttempts = Math.max(1, a.retry.maxAttempts);
  let lastError: ReinfolibError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (a.signal?.aborted) return err({ kind: "aborted", cause: a.signal.reason });

    // Phase 2: rate-limit gate
    if (a.bucket !== undefined) {
      try {
        await a.bucket.acquire(a.signal);
      } catch (cause) {
        return err({ kind: "aborted", cause });
      }
    }

    // Phase 3: fetch
    const timeoutAc = new AbortController();
    const timeoutId = setTimeout(() => timeoutAc.abort(new Error("request timeout")), a.timeoutMs);
    const callerAbortListener = (): void => timeoutAc.abort(a.signal!.reason);
    a.signal?.addEventListener("abort", callerAbortListener, { once: true });

    let res: Response;
    try {
      const headers: Record<string, string> = {
        "Ocp-Apim-Subscription-Key": a.apiKey,
        Accept: "application/json",
      };
      if (a.userAgent !== undefined) headers["User-Agent"] = a.userAgent;
      res = await a.fetch(url, { method: "GET", headers, signal: timeoutAc.signal });
    } catch (cause) {
      clearTimeout(timeoutId);
      a.signal?.removeEventListener("abort", callerAbortListener);

      if (a.signal?.aborted) return err({ kind: "aborted", cause });
      if (isAbortError(cause)) {
        lastError = { kind: "timeout", timeoutMs: a.timeoutMs, attempts: attempt };
      } else {
        lastError = { kind: "network", cause, attempts: attempt };
      }
      if (attempt < maxAttempts) {
        try {
          await sleep(computeBackoffMs(attempt, a.retry, undefined), a.signal);
        } catch (cause) {
          return err({ kind: "aborted", cause });
        }
        continue;
      }
      return err(lastError);
    }
    clearTimeout(timeoutId);
    a.signal?.removeEventListener("abort", callerAbortListener);

    // Phase 4: status handling
    if (!res.ok) {
      if (shouldRetryStatus(res.status, a.retry) && attempt < maxAttempts) {
        const retryAfter = res.headers.get("Retry-After") ?? undefined;
        try {
          await sleep(computeBackoffMs(attempt, a.retry, retryAfter), a.signal);
        } catch (cause) {
          return err({ kind: "aborted", cause });
        }
        continue;
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => undefined);
      }
      return err({ kind: "api", status: res.status, body, attempts: attempt });
    }

    // Phase 5: response validation
    let json: unknown;
    try {
      json = await res.json();
    } catch (cause) {
      return err({ kind: "network", cause, attempts: attempt });
    }
    const parsed = a.responseSchema.safeParse(json);
    if (!parsed.success) {
      return err({ kind: "validation", phase: "response", issues: parsed.error.issues });
    }
    return ok(parsed.data);
  }

  return err(
    lastError ?? {
      kind: "network",
      cause: new Error("retry loop exhausted"),
      attempts: maxAttempts,
    },
  );
}

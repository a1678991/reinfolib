export type Jitter = "none" | "full";

export type RetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: Jitter;
  retryOn: number[];
};

export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: "full",
  retryOn: [408, 425, 429, 500, 502, 503, 504],
};

export function parseRetryAfter(header: string | undefined): number | undefined {
  if (header === undefined) return undefined;
  const trimmed = header.trim();
  if (trimmed === "") return undefined;
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum >= 0) return asNum * 1000;
  const asDate = Date.parse(trimmed);
  if (Number.isNaN(asDate)) return undefined;
  return Math.max(0, asDate - Date.now());
}

export function computeBackoffMs(
  attempt: number,
  cfg: RetryConfig,
  retryAfterHeader: string | undefined,
  random: () => number = Math.random,
): number {
  const explicit = parseRetryAfter(retryAfterHeader);
  if (explicit !== undefined) return Math.min(explicit, cfg.maxDelayMs);

  const exp = cfg.baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(exp, cfg.maxDelayMs);
  if (cfg.jitter === "none") return capped;
  return capped * random();
}

export function shouldRetryStatus(status: number, cfg: RetryConfig): boolean {
  return cfg.retryOn.includes(status);
}

export const sleep = (ms: number, signal?: AbortSignal | undefined): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) return reject(signal.reason);
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject((signal as AbortSignal).reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

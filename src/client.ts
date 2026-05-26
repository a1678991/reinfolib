import { TokenBucket } from "./core/rate-limit.js";
import { DEFAULT_RETRY, type RetryConfig } from "./core/retry.js";

export type RateLimitOption = false | { capacity: number; refillPerSecond: number };
export type RetryOption = false | Partial<RetryConfig>;

export type ReinfolibClientOptions = {
  apiKey: string;
  baseUrl?: string | undefined;
  timeoutMs?: number | undefined;
  userAgent?: string | undefined;
  rateLimit?: RateLimitOption | undefined;
  retry?: RetryOption | undefined;
  fetch?: typeof globalThis.fetch | undefined;
};

export type CallOptions = {
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  retry?: RetryOption | undefined;
};

const DEFAULT_BASE_URL = "https://www.reinfolib.mlit.go.jp";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT = { capacity: 10, refillPerSecond: 5 } as const;

export class ReinfolibClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly userAgent: string | undefined;
  readonly bucket: TokenBucket | undefined;
  readonly retry: RetryConfig;
  readonly fetch: typeof globalThis.fetch;

  // Category facades — populated as endpoints are added (Task 20 onward).
  readonly prices: Record<string, unknown> = {};

  constructor(opts: ReinfolibClientOptions) {
    if (!opts.apiKey) throw new Error("ReinfolibClient: apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = opts.userAgent;
    this.fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);

    const rl = opts.rateLimit ?? DEFAULT_RATE_LIMIT;
    this.bucket = rl === false ? undefined : new TokenBucket(rl);

    this.retry =
      opts.retry === false
        ? { ...DEFAULT_RETRY, maxAttempts: 1 }
        : { ...DEFAULT_RETRY, ...opts.retry };
  }
}

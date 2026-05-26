export type TokenBucketConfig = {
  capacity: number;
  refillPerSecond: number;
};

type Waiter = {
  resolve: () => void;
  reject: (cause: unknown) => void;
  signal?: AbortSignal | undefined;
  abortListener?: (() => void) | undefined;
};

export class TokenBucket {
  readonly #capacity: number;
  readonly #refillPerSecond: number;
  #tokens: number;
  #lastRefillMs: number;
  readonly #queue: Waiter[] = [];
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(cfg: TokenBucketConfig) {
    if (cfg.capacity <= 0) throw new Error("capacity must be > 0");
    if (cfg.refillPerSecond <= 0) throw new Error("refillPerSecond must be > 0");
    this.#capacity = cfg.capacity;
    this.#refillPerSecond = cfg.refillPerSecond;
    this.#tokens = cfg.capacity;
    this.#lastRefillMs = Date.now();
  }

  availableTokens(): number {
    this.#refill();
    return this.#tokens;
  }

  acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted === true) return Promise.reject(signal.reason);

    this.#refill();
    if (this.#queue.length === 0 && this.#tokens >= 1) {
      this.#tokens -= 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject };
      if (signal !== undefined) {
        waiter.signal = signal;
        waiter.abortListener = () => {
          const i = this.#queue.indexOf(waiter);
          if (i >= 0) this.#queue.splice(i, 1);
          reject(signal.reason);
        };
        signal.addEventListener("abort", waiter.abortListener, { once: true });
      }
      this.#queue.push(waiter);
      this.#scheduleWake();
    });
  }

  #refill(): void {
    const now = Date.now();
    const elapsed = (now - this.#lastRefillMs) / 1000;
    if (elapsed <= 0) return;
    this.#tokens = Math.min(this.#capacity, this.#tokens + elapsed * this.#refillPerSecond);
    this.#lastRefillMs = now;
  }

  #scheduleWake(): void {
    if (this.#timer !== undefined || this.#queue.length === 0) return;
    this.#refill();
    if (this.#tokens >= 1) {
      this.#drain();
      return;
    }
    const needed = 1 - this.#tokens;
    const msUntilToken = Math.ceil((needed / this.#refillPerSecond) * 1000);
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      this.#drain();
      this.#scheduleWake();
    }, msUntilToken);
  }

  #drain(): void {
    this.#refill();
    while (this.#queue.length > 0 && this.#tokens >= 1) {
      const w = this.#queue.shift()!;
      if (w.signal !== undefined && w.abortListener !== undefined) {
        w.signal.removeEventListener("abort", w.abortListener);
      }
      this.#tokens -= 1;
      w.resolve();
    }
  }
}

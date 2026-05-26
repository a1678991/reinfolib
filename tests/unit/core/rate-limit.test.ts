import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenBucket } from "../../../src/core/rate-limit.js";

describe("TokenBucket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("immediately grants when tokens available", async () => {
    const b = new TokenBucket({ capacity: 3, refillPerSecond: 1 });
    await b.acquire();
    await b.acquire();
    await b.acquire();
    // bucket empty now
    expect(b.availableTokens()).toBeCloseTo(0, 5);
  });

  it("waits when bucket empty, resolves after refill", async () => {
    const b = new TokenBucket({ capacity: 1, refillPerSecond: 2 });
    await b.acquire(); // drain
    const p = b.acquire(); // must wait ~500ms for 1 token
    let resolved = false;
    p.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(400);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(150); // total 550ms — past 500
    expect(resolved).toBe(true);
  });

  it("preserves FIFO order", async () => {
    const b = new TokenBucket({ capacity: 1, refillPerSecond: 1 });
    await b.acquire();

    const order: number[] = [];
    const p1 = b.acquire().then(() => order.push(1));
    const p2 = b.acquire().then(() => order.push(2));
    const p3 = b.acquire().then(() => order.push(3));

    await vi.advanceTimersByTimeAsync(3500);
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("rejects pending acquire when signal aborts", async () => {
    const b = new TokenBucket({ capacity: 1, refillPerSecond: 0.1 });
    await b.acquire();
    const ac = new AbortController();
    const p = b.acquire(ac.signal);
    ac.abort(new Error("user cancel"));
    await expect(p).rejects.toThrow("user cancel");
  });
});

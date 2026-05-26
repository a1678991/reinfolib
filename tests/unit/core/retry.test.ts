import { describe, it, expect } from "vitest";
import { computeBackoffMs, parseRetryAfter, DEFAULT_RETRY } from "../../../src/core/retry.js";

describe("computeBackoffMs", () => {
  it("doubles each attempt, capped at maxDelayMs", () => {
    const cfg = { ...DEFAULT_RETRY, baseDelayMs: 500, maxDelayMs: 4000, jitter: "none" as const };
    expect(computeBackoffMs(1, cfg, undefined, () => 1)).toBe(500);
    expect(computeBackoffMs(2, cfg, undefined, () => 1)).toBe(1000);
    expect(computeBackoffMs(3, cfg, undefined, () => 1)).toBe(2000);
    expect(computeBackoffMs(4, cfg, undefined, () => 1)).toBe(4000);
    expect(computeBackoffMs(5, cfg, undefined, () => 1)).toBe(4000); // capped
  });

  it("with full jitter, delay is random in [0, computed]", () => {
    const cfg = { ...DEFAULT_RETRY, baseDelayMs: 1000, maxDelayMs: 30000, jitter: "full" as const };
    expect(computeBackoffMs(2, cfg, undefined, () => 0)).toBe(0);
    expect(computeBackoffMs(2, cfg, undefined, () => 0.9999999)).toBeCloseTo(2000, 0);
  });

  it("honors Retry-After (seconds) when provided", () => {
    const cfg = { ...DEFAULT_RETRY, baseDelayMs: 500, maxDelayMs: 30000, jitter: "none" as const };
    expect(computeBackoffMs(1, cfg, "3", () => 1)).toBe(3000);
  });

  it("caps Retry-After at maxDelayMs", () => {
    const cfg = { ...DEFAULT_RETRY, baseDelayMs: 500, maxDelayMs: 10000, jitter: "none" as const };
    expect(computeBackoffMs(1, cfg, "99999", () => 1)).toBe(10000);
  });
});

describe("parseRetryAfter", () => {
  it("parses seconds form", () => {
    expect(parseRetryAfter("5")).toBe(5000);
  });

  it("parses HTTP-date form (returns ms-from-now, clamped >= 0)", () => {
    const future = new Date(Date.now() + 7000).toUTCString();
    const v = parseRetryAfter(future);
    expect(v).toBeGreaterThanOrEqual(6000);
    expect(v).toBeLessThanOrEqual(8000);
  });

  it("returns undefined for garbage", () => {
    expect(parseRetryAfter("not a date")).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });
});

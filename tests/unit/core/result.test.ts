import { describe, it, expect } from "vitest";
import { ok, err, type Result } from "../../../src/core/result.js";

describe("Result", () => {
  it("ok() produces a success variant", () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });

  it("err() produces a failure variant", () => {
    const r = err("boom");
    expect(r).toEqual({ ok: false, error: "boom" });
  });

  it("discriminates on ok at the type level", () => {
    const r: Result<number, string> = Math.random() < 2 ? ok(1) : err("x");
    if (r.ok) {
      const n: number = r.data; // would not compile if Result lacked discrimination
      expect(n).toBe(1);
    } else {
      expect(typeof r.error).toBe("string");
    }
  });
});

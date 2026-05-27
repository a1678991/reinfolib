import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/client.js";

describe("ReinfolibClient", () => {
  it("constructs with just an apiKey", () => {
    const c = new ReinfolibClient({ apiKey: "k" });
    expect(c).toBeInstanceOf(ReinfolibClient);
  });

  it("exposes the price category facade", () => {
    const c = new ReinfolibClient({ apiKey: "k" });
    expect(c.prices).toBeDefined();
  });

  it("exposes the urbanPlanning category facade", () => {
    const c = new ReinfolibClient({ apiKey: "k" });
    expect(c.urbanPlanning).toBeDefined();
  });

  it("rejects empty apiKey", () => {
    expect(() => new ReinfolibClient({ apiKey: "" })).toThrow();
  });

  it("uses the provided baseUrl override", () => {
    const c = new ReinfolibClient({ apiKey: "k", baseUrl: "https://custom.example/" });
    expect(c.baseUrl).toBe("https://custom.example/");
  });
});

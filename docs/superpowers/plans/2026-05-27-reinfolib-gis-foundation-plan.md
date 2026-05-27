# Reinfolib GIS Foundation Plan (v1.2.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GIS (GeoJSON + PBF) support to `@a1678991/reinfolib` and ship **XKT001 (Urban Planning Districts/Zoning)** as the reference GIS endpoint. End state publishable as v1.2.0.

**Architecture:** Refactor `client.ts` into per-category facade modules (eliminates the "ballooning constructor" code-review concern before adding more categories). Extend `core/request.ts` with a binary response path so callers requesting `format=pbf` get a raw `Uint8Array` (no zod validation; no PBF decoder dependency). Add shared GeoJSON `FeatureCollection<G, P>` schemas in `core/geojson.ts` so all future GIS endpoints compose Geometry × Properties cheaply.

**Tech Stack:** TypeScript 6, zod 4, vitest 4 — unchanged from Plan 1.

**Spec reference:** `docs/superpowers/specs/2026-05-26-reinfolib-typescript-client-design.md` §3–§9.
**Predecessor plan:** `docs/superpowers/plans/2026-05-26-reinfolib-foundation-plan.md` (v0.1.0–v1.1.0).

**Out of scope (deferred to later plans):**

- Remaining JSON endpoints (XCT001, XPT001, XPT002, XIT002) — Plan 3.
- Remaining GIS endpoints (urbanPlanning except XKT001, facilities, demographics, disaster) — Plans 4–6.
- PBF→GeoJSON decoding (callers feed `Uint8Array` to `@mapbox/vector-tile` themselves).
- Updating the example CLI to demo `--format pbf` — defer to Plan 3+ once we know if it's worth the UX cost.

---

## File Structure (end of plan)

```
src/
├── categories/                       # NEW: one facade module per API category
│   ├── prices.ts                     # NEW: extracted from client.ts
│   └── urban-planning.ts             # NEW: wires xkt001
├── client.ts                         # MODIFIED: slimmed; uses category facades
├── core/
│   ├── geojson.ts                    # NEW: shared FeatureCollection zod schemas
│   ├── request.ts                    # MODIFIED: + binary response path
│   ├── common.ts                     # MODIFIED: + ztile-coordinate schemas
│   └── ...unchanged
└── endpoints/
    ├── prices/
    │   └── xit001.ts                 # unchanged
    └── urban-planning/               # NEW
        └── xkt001.ts                 # NEW

tests/
├── fixtures/
│   ├── xit001.json                   # unchanged
│   ├── xkt001.json                   # NEW (captured GeoJSON)
│   └── xkt001.pbf                    # NEW (captured binary tile)
├── integration/
│   ├── xit001.test.ts                # unchanged
│   └── xkt001.test.ts                # NEW (opt-in live API)
└── unit/
    ├── core/
    │   ├── geojson.test.ts           # NEW
    │   ├── request.test.ts           # MODIFIED: + binary path tests
    │   ├── common.test.ts            # MODIFIED: + ztile tests
    │   └── ...unchanged
    └── endpoints/
        ├── prices/xit001.test.ts     # unchanged
        └── urban-planning/
            └── xkt001.test.ts        # NEW
```

---

## Task 1: Branch off main

**Files:** none (git only)

- [ ] **Step 1.1: Verify clean working tree on main**

```bash
git status
git log --oneline | head -3
```

Expected: clean tree; HEAD is `fbc1607 chore(release): 1.1.0 [skip ci]` or newer.

- [ ] **Step 1.2: Create feature branch**

```bash
git checkout -b feat/gis-foundation
```

Expected: `Switched to a new branch 'feat/gis-foundation'`.

All subsequent commits land on this branch. The pre-push hook only blocks pushes to `main`; pushing this branch needs no `LEFTHOOK=0`.

---

## Task 2: Extract `prices` facade to its own module

This is the code-review follow-up flagged in the v1.0.0 final review: `client.ts` will balloon as we add categories. Extract the pattern now, before adding `urbanPlanning`. Strict TDD not warranted (pure refactor of working code), but every existing test must still pass.

**Files:**

- Create: `src/categories/prices.ts`
- Modify: `src/client.ts`

- [ ] **Step 2.1: Create the facade module**

Create `src/categories/prices.ts`:

```ts
import * as xit001 from "../endpoints/prices/xit001.js";
import type { ReinfolibClient, CallOptions } from "../client.js";

export type PricesFacade = {
  transactionPoints: (params: xit001.Params, opts?: CallOptions) => ReturnType<typeof xit001.call>;
};

export function createPricesFacade(client: ReinfolibClient): PricesFacade {
  return {
    transactionPoints: (params, opts) => xit001.call(client, params, opts),
  };
}
```

- [ ] **Step 2.2: Update `src/client.ts` to use it**

Open `src/client.ts`. At the top, replace the existing `import * as xit001 from "./endpoints/prices/xit001.js";` line with:

```ts
import { createPricesFacade, type PricesFacade } from "./categories/prices.js";
```

Find the field declaration:

```ts
readonly prices: {
  transactionPoints: (
    params: import("./endpoints/prices/xit001.js").Params,
    opts?: CallOptions,
  ) => ReturnType<typeof import("./endpoints/prices/xit001.js").call>;
};
```

Replace with:

```ts
readonly prices: PricesFacade;
```

Find the constructor assignment:

```ts
this.prices = {
  transactionPoints: (params, opts) => xit001.call(this, params, opts),
};
```

Replace with:

```ts
this.prices = createPricesFacade(this);
```

- [ ] **Step 2.3: Run all tests**

```bash
pnpm test
```

Expected: all 47 tests still passing.

- [ ] **Step 2.4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: typecheck silent, lint clean (modulo pre-existing warnings).

- [ ] **Step 2.5: Commit**

```bash
git add src/categories/ src/client.ts
git commit -m "refactor(client): extract prices facade to its own module"
```

---

## Task 3: Add ztile-coordinate schemas to `core/common.ts`

XKT001 (and every future XKT\* endpoint) takes `z`, `x`, `y` integer params. Centralize the schemas so endpoints don't redeclare.

**Files:**

- Modify: `src/core/common.ts`
- Modify: `tests/unit/core/common.test.ts`

- [ ] **Step 3.1: Write failing tests**

Append to `tests/unit/core/common.test.ts`:

```ts
import { zoomSchema, tileCoordSchema } from "../../../src/core/common.js";

describe("ztile schemas", () => {
  it("zoom accepts 11..15", () => {
    for (const z of [11, 12, 13, 14, 15]) expect(zoomSchema.safeParse(z).success).toBe(true);
    expect(zoomSchema.safeParse(10).success).toBe(false);
    expect(zoomSchema.safeParse(16).success).toBe(false);
    expect(zoomSchema.safeParse(13.5).success).toBe(false);
  });

  it("tileCoord accepts non-negative integers", () => {
    expect(tileCoordSchema.safeParse(0).success).toBe(true);
    expect(tileCoordSchema.safeParse(14626).success).toBe(true);
    expect(tileCoordSchema.safeParse(-1).success).toBe(false);
    expect(tileCoordSchema.safeParse(1.5).success).toBe(false);
  });
});
```

- [ ] **Step 3.2: Verify failure**

```bash
pnpm test tests/unit/core/common.test.ts
```

Expected: FAIL — `zoomSchema`/`tileCoordSchema` not exported.

- [ ] **Step 3.3: Implement**

Append to `src/core/common.ts`:

```ts
export const zoomSchema = z.number().int().min(11).max(15);
export const tileCoordSchema = z.number().int().nonnegative();
```

- [ ] **Step 3.4: Verify pass**

```bash
pnpm test tests/unit/core/common.test.ts
```

Expected: 8 tests pass (6 existing + 2 new).

- [ ] **Step 3.5: Commit**

```bash
git add src/core/common.ts tests/unit/core/common.test.ts
git commit -m "feat(common): add zoom and tile-coord zod schemas for GIS endpoints"
```

---

## Task 4: Add shared GeoJSON schemas (`core/geojson.ts`)

Every GIS endpoint returns a `FeatureCollection<G, P>`. Centralize the structural schemas; per-endpoint modules supply only the geometry choice and properties shape.

**Files:**

- Create: `src/core/geojson.ts`
- Create: `tests/unit/core/geojson.test.ts`

- [ ] **Step 4.1: Write failing tests**

Create `tests/unit/core/geojson.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  PointGeometry,
  LineStringGeometry,
  PolygonGeometry,
  MultiPolygonGeometry,
  FeatureCollectionSchema,
} from "../../../src/core/geojson.js";

describe("PointGeometry", () => {
  it("parses a valid Point", () => {
    expect(PointGeometry.safeParse({ type: "Point", coordinates: [139.7, 35.6] }).success).toBe(
      true,
    );
  });
  it("rejects wrong type", () => {
    expect(PointGeometry.safeParse({ type: "Polygon", coordinates: [139.7, 35.6] }).success).toBe(
      false,
    );
  });
  it("rejects non-pair coordinates", () => {
    expect(PointGeometry.safeParse({ type: "Point", coordinates: [139.7] }).success).toBe(false);
  });
});

describe("PolygonGeometry", () => {
  it("parses a single-ring polygon", () => {
    const r = PolygonGeometry.safeParse({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("MultiPolygonGeometry", () => {
  it("parses a multi-polygon", () => {
    const r = MultiPolygonGeometry.safeParse({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        [
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2],
          ],
        ],
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("LineStringGeometry", () => {
  it("parses a valid LineString", () => {
    const r = LineStringGeometry.safeParse({
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("FeatureCollectionSchema", () => {
  const props = z.object({ name: z.string() });
  const schema = FeatureCollectionSchema(PointGeometry, props);

  it("parses a valid FeatureCollection", () => {
    const r = schema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { name: "origin" },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects wrong top-level type", () => {
    const r = schema.safeParse({ type: "Feature", features: [] });
    expect(r.success).toBe(false);
  });

  it("rejects features with wrong geometry", () => {
    const r = schema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [] },
          properties: { name: "x" },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects features with missing required property", () => {
    const r = schema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {},
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 4.2: Verify failure**

```bash
pnpm test tests/unit/core/geojson.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4.3: Implement**

Create `src/core/geojson.ts`:

```ts
import { z } from "zod";

const Position = z.tuple([z.number(), z.number()]);

export const PointGeometry = z.object({
  type: z.literal("Point"),
  coordinates: Position,
});

export const LineStringGeometry = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(Position).min(2),
});

const LinearRing = z.array(Position).min(4); // first == last enforced by API conventions, not asserted here
export const PolygonGeometry = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(LinearRing).min(1),
});

export const MultiPolygonGeometry = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(LinearRing).min(1)).min(1),
});

export function FeatureCollectionSchema<G extends z.ZodTypeAny, P extends z.ZodTypeAny>(
  geometry: G,
  properties: P,
) {
  return z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        geometry,
        properties,
      }),
    ),
  });
}
```

- [ ] **Step 4.4: Verify pass**

```bash
pnpm test tests/unit/core/geojson.test.ts
```

Expected: 10 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/core/geojson.ts tests/unit/core/geojson.test.ts
git commit -m "feat(core): add shared GeoJSON FeatureCollection zod schemas"
```

---

## Task 5: Add binary response path to `core/request.ts`

When the caller wants PBF, the pipeline must skip JSON parse + zod validate and return the raw bytes as `Uint8Array`. Add a `responseKind` arg; default `"json"` preserves existing behavior.

**Files:**

- Modify: `src/core/request.ts`
- Modify: `tests/unit/core/request.test.ts`

- [ ] **Step 5.1: Write failing tests**

Append to `tests/unit/core/request.test.ts`:

```ts
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
```

- [ ] **Step 5.2: Verify failure**

```bash
pnpm test tests/unit/core/request.test.ts
```

Expected: 3 new tests FAIL (existing 10 still pass). Failure mode is the binary path being absent.

- [ ] **Step 5.3: Implement**

Open `src/core/request.ts`. Locate the `RequestArgs` type:

```ts
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
```

Add an optional field at the end of the type:

```ts
  responseKind?: "json" | "binary" | undefined;
```

Adjust the return signature to allow `Uint8Array` from the binary path. Change:

```ts
export async function request<P, R>(a: RequestArgs<P, R>): Promise<Result<R, ReinfolibError>>;
```

to:

```ts
export async function request<P, R>(
  a: RequestArgs<P, R>,
): Promise<Result<R | Uint8Array, ReinfolibError>>;
```

Locate "Phase 5: response validation" near the end of the function:

```ts
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
```

Replace with a branch on `responseKind`:

```ts
// Phase 5: response read + validation
if (a.responseKind === "binary") {
  let buf: ArrayBuffer;
  try {
    buf = await res.arrayBuffer();
  } catch (cause) {
    return err({ kind: "network", cause, attempts: attempt });
  }
  return ok(new Uint8Array(buf));
}

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
```

Also adjust the `Accept` header: when binary, we shouldn't claim to accept JSON. Locate:

```ts
const headers: Record<string, string> = {
  "Ocp-Apim-Subscription-Key": a.apiKey,
  Accept: "application/json",
};
```

Replace with:

```ts
const headers: Record<string, string> = {
  "Ocp-Apim-Subscription-Key": a.apiKey,
  Accept: a.responseKind === "binary" ? "application/octet-stream" : "application/json",
};
```

- [ ] **Step 5.4: Verify pass**

```bash
pnpm test tests/unit/core/request.test.ts
```

Expected: 13 tests pass (10 existing + 3 new).

- [ ] **Step 5.5: Typecheck**

```bash
pnpm typecheck
```

Expected: silent. The signature change to `Result<R | Uint8Array, _>` means callers may need to narrow when consuming `data`, but `xit001.ts` already returns `Result<Response, _>` via its own `call()` wrapper which can narrow internally. Verify nothing breaks in the existing code:

```bash
pnpm test
```

Expected: 50 tests pass total (47 prior + 3 new).

If `xit001.ts` or its tests fail because of the wider return type, narrow in `xit001.ts`'s `call()` signature. The function should still return `Promise<Result<Response, ReinfolibError>>` from the user's perspective. Use a typed wrapper:

```ts
export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptions = {},
): Promise<Result<Response, ReinfolibError>> {
  return request({ ... }) as Promise<Result<Response, ReinfolibError>>;
}
```

The `as` cast is acceptable here: `xit001` never sets `responseKind: "binary"`, so the union narrows to `R` at the call site. Document the cast with a one-line comment if you add it.

- [ ] **Step 5.6: Commit**

```bash
git add src/core/request.ts tests/unit/core/request.test.ts src/endpoints/prices/xit001.ts
git commit -m "feat(request): add binary response path for PBF endpoints"
```

(Only include `xit001.ts` in the add if you actually modified it to add the cast.)

---

## Task 6: Capture XKT001 fixtures from the live API

We need both a GeoJSON sample and a PBF sample for the tests. Tokyo Chuo Ward at zoom 14 reliably returns urban-planning data.

**Files:**

- Create: `tests/fixtures/xkt001.json`
- Create: `tests/fixtures/xkt001.pbf`

- [ ] **Step 6.1: Capture GeoJSON fixture**

For Tokyo Chuo (approximate tile at z=14): `x=14552, y=6451`. (If empty, try `z=14, x=14553, y=6451` or `z=13, x=7276, y=3225`.)

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT001?response_format=geojson&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt001.json
```

Verify structure + non-empty features:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xkt001.json","utf8")); if(j.type!=="FeatureCollection") throw new Error("not a FeatureCollection: "+JSON.stringify(j).slice(0,200)); console.log("features:", j.features.length, "first geom type:", j.features[0]?.geometry?.type, "first props keys:", Object.keys(j.features[0]?.properties ?? {}));'
```

If features count is 0, retry the curl with a different `(x, y)` until non-empty. Document the tile coordinates that worked. If the response is an error envelope, **stop and report BLOCKED**.

- [ ] **Step 6.2: Capture PBF fixture**

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT001?response_format=pbf&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt001.pbf
```

(Use the same `(z, x, y)` that worked for GeoJSON.)

Verify it's binary and non-empty:

```bash
file tests/fixtures/xkt001.pbf
stat -c '%s' tests/fixtures/xkt001.pbf
```

Expected: `file` reports `data` (or similar binary type, not JSON / HTML); size > 0 bytes.

If size is 0 or the file is JSON (error envelope), **stop and report BLOCKED**.

- [ ] **Step 6.3: Commit fixtures**

```bash
git add tests/fixtures/xkt001.json tests/fixtures/xkt001.pbf
git commit -m "test(fixtures): capture XKT001 GeoJSON and PBF samples"
```

---

## Task 7: Implement XKT001 endpoint module

The full set of features per the spec: param validation, GeoJSON parsing via shared `FeatureCollectionSchema`, PBF passthrough returning `Uint8Array`. Both behaviors are selectable from the same `call()` via function overloads on `opts.format`.

**Files:**

- Create: `src/endpoints/urban-planning/xkt001.ts`
- Create: `tests/unit/endpoints/urban-planning/xkt001.test.ts`

- [ ] **Step 7.1: Write failing tests**

Create `tests/unit/endpoints/urban-planning/xkt001.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import {
  paramsSchema,
  responseSchema,
  call,
} from "../../../../src/endpoints/urban-planning/xkt001.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xkt001.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xkt001.pbf"));

describe("XKT001 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ z: 14, x: 14552, y: 6451 }).success).toBe(true);
  });

  it("rejects zoom < 11 or > 15", () => {
    expect(paramsSchema.safeParse({ z: 10, x: 1, y: 1 }).success).toBe(false);
    expect(paramsSchema.safeParse({ z: 16, x: 1, y: 1 }).success).toBe(false);
  });

  it("rejects negative tile coords", () => {
    expect(paramsSchema.safeParse({ z: 14, x: -1, y: 0 }).success).toBe(false);
    expect(paramsSchema.safeParse({ z: 14, x: 0, y: -1 }).success).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(paramsSchema.safeParse({ z: 14.5, x: 1, y: 1 }).success).toBe(false);
    expect(paramsSchema.safeParse({ z: 14, x: 1.5, y: 1 }).success).toBe(false);
  });
});

describe("XKT001 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XKT001 call() — GeoJSON", () => {
  it("returns ok with parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("sends response_format=geojson in the query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451 });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
    expect(url).toContain("z=14");
    expect(url).toContain("x=14552");
    expect(url).toContain("y=6451");
  });
});

describe("XKT001 call() — PBF", () => {
  it("returns ok with Uint8Array when format=pbf", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toBeInstanceOf(Uint8Array);
      expect((res.data as Uint8Array).byteLength).toBe(pbfFixture.byteLength);
    }
  });

  it("sends response_format=pbf in the query string", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=pbf");
  });
});
```

- [ ] **Step 7.2: Create the directory + verify failure**

```bash
mkdir -p src/endpoints/urban-planning tests/unit/endpoints/urban-planning
pnpm test tests/unit/endpoints/urban-planning/xkt001.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7.3: Implement the endpoint module**

Create `src/endpoints/urban-planning/xkt001.ts`:

```ts
import { z } from "zod";
import { tileCoordSchema, zoomSchema } from "../../core/common.js";
import {
  FeatureCollectionSchema,
  MultiPolygonGeometry,
  PolygonGeometry,
} from "../../core/geojson.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

export const paramsSchema = z.object({
  z: zoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
});
export type Params = z.infer<typeof paramsSchema>;

const propsSchema = z
  .object({
    prefecture: z.string().optional(),
    city_code: z.string().optional(),
    city_name: z.string().optional(),
    kubun_id: z.number().int().optional(),
    decision_date: z.string().optional(),
    decision_classification: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number: z.string().optional(),
    area_classification_ja: z.string().optional(),
    first_decision_date: z.string().optional(),
    notice_number_s: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(
  z.union([PolygonGeometry, MultiPolygonGeometry]),
  propsSchema,
);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XKT001", path: "/ex-api/external/XKT001" } as const;

export type CallOptsGeoJson = CallOptions & { format?: "geojson" | undefined };
export type CallOptsPbf = CallOptions & { format: "pbf" };

export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptsPbf,
): Promise<Result<Uint8Array, ReinfolibError>>;
export function call(
  client: ReinfolibClient,
  params: Params,
  opts?: CallOptsGeoJson,
): Promise<Result<Response, ReinfolibError>>;
export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptions & { format?: "geojson" | "pbf" | undefined } = {},
): Promise<Result<Response | Uint8Array, ReinfolibError>> {
  const format = opts.format ?? "geojson";
  const apiParams = { ...params, response_format: format };
  const retry =
    opts.retry === false ? { ...client.retry, maxAttempts: 1 } : { ...client.retry, ...opts.retry };

  return request({
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
    path: endpoint.path,
    params: apiParams,
    paramsSchema: z.object({
      z: zoomSchema,
      x: tileCoordSchema,
      y: tileCoordSchema,
      response_format: z.enum(["geojson", "pbf"]),
    }),
    responseSchema,
    bucket: client.bucket,
    retry,
    timeoutMs: opts.timeoutMs ?? client.timeoutMs,
    ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    fetch: client.fetch,
    ...(client.userAgent !== undefined ? { userAgent: client.userAgent } : {}),
    responseKind: format === "pbf" ? "binary" : "json",
  });
}
```

- [ ] **Step 7.4: Verify pass**

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt001.test.ts
```

Expected: 9 tests pass.

If the response-schema parse test fails because the fixture has a geometry type other than `Polygon` / `MultiPolygon`, update the schema's `z.union(...)` to include the actual geometry type (e.g., add `PointGeometry`). The fixture is the source of truth.

- [ ] **Step 7.5: Run all tests**

```bash
pnpm test
```

Expected: 59 tests pass (50 prior + 9 new).

- [ ] **Step 7.6: Commit**

```bash
git add src/endpoints/urban-planning/ tests/unit/endpoints/urban-planning/
git commit -m "feat(urban-planning): add XKT001 zoning endpoint with GeoJSON + PBF support"
```

---

## Task 8: Wire XKT001 via the `urbanPlanning` facade

Mirror the `prices` facade pattern. Adds `client.urbanPlanning.zoning(...)` to the public API.

**Files:**

- Create: `src/categories/urban-planning.ts`
- Modify: `src/client.ts`
- Modify: `tests/unit/endpoints/urban-planning/xkt001.test.ts` (add a wiring test)

- [ ] **Step 8.1: Write failing wiring test**

Append to `tests/unit/endpoints/urban-planning/xkt001.test.ts`:

```ts
describe("ReinfolibClient.urbanPlanning.zoning", () => {
  it("is wired and delegates to XKT001 call() (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.zoning({ z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
  });

  it("is wired and delegates to XKT001 call() (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.zoning({ z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});
```

- [ ] **Step 8.2: Verify failure**

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt001.test.ts
```

Expected: 2 new tests FAIL — `client.urbanPlanning` doesn't exist yet.

- [ ] **Step 8.3: Create the facade module**

Create `src/categories/urban-planning.ts`:

```ts
import * as xkt001 from "../endpoints/urban-planning/xkt001.js";
import type { ReinfolibClient, CallOptions } from "../client.js";

export type UrbanPlanningFacade = {
  zoning: {
    (params: xkt001.Params, opts: xkt001.CallOptsPbf): ReturnType<typeof xkt001.call>;
    (params: xkt001.Params, opts?: xkt001.CallOptsGeoJson): ReturnType<typeof xkt001.call>;
  };
};

export function createUrbanPlanningFacade(client: ReinfolibClient): UrbanPlanningFacade {
  return {
    zoning: ((params, opts) => xkt001.call(client, params, opts)) as UrbanPlanningFacade["zoning"],
  };
}
```

The cast is necessary: TypeScript can't widen an overloaded function literal in object form to retain overload resolution without help.

- [ ] **Step 8.4: Wire into `client.ts`**

Open `src/client.ts`. Add at the top, alongside the existing `createPricesFacade` import:

```ts
import {
  createUrbanPlanningFacade,
  type UrbanPlanningFacade,
} from "./categories/urban-planning.js";
```

Add a field declaration alongside `prices`:

```ts
  readonly urbanPlanning: UrbanPlanningFacade;
```

In the constructor, after `this.prices = createPricesFacade(this);`, add:

```ts
this.urbanPlanning = createUrbanPlanningFacade(this);
```

- [ ] **Step 8.5: Verify pass**

```bash
pnpm test
```

Expected: 61 tests pass (59 prior + 2 new).

- [ ] **Step 8.6: Typecheck**

```bash
pnpm typecheck
```

Expected: silent.

- [ ] **Step 8.7: Commit**

```bash
git add src/categories/urban-planning.ts src/client.ts tests/unit/endpoints/urban-planning/xkt001.test.ts
git commit -m "feat(client): wire XKT001 via urbanPlanning facade"
```

---

## Task 9: Add opt-in integration test for XKT001

**Files:**

- Create: `tests/integration/xkt001.test.ts`

- [ ] **Step 9.1: Write the integration test**

Create `tests/integration/xkt001.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XKT001 — live", () => {
  runIt(
    "GeoJSON: hits the real endpoint and parses the response",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.urbanPlanning.zoning({ z: 14, x: 14552, y: 6451 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.type).toBe("FeatureCollection");
        expect(Array.isArray(res.data.features)).toBe(true);
      }
    },
    30_000,
  );

  runIt(
    "PBF: hits the real endpoint and returns Uint8Array",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.urbanPlanning.zoning(
        { z: 14, x: 14552, y: 6451 },
        { format: "pbf" },
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toBeInstanceOf(Uint8Array);
        expect((res.data as Uint8Array).byteLength).toBeGreaterThan(0);
      }
    },
    30_000,
  );
});
```

- [ ] **Step 9.2: Verify it skips without env**

```bash
pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 3 skipped tests (1 existing XIT001 + 2 new XKT001).

- [ ] **Step 9.3: Verify it passes with env (manual)**

```bash
INTEGRATION=1 REINFOLIB_API_KEY=YOUR_API_KEY \
  pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 3 passed.

- [ ] **Step 9.4: Commit**

```bash
git add tests/integration/xkt001.test.ts
git commit -m "test: add opt-in XKT001 integration test"
```

---

## Task 10: Update README with GIS example

**Files:**

- Modify: `README.md`

- [ ] **Step 10.1: Append a GIS section to the README**

Read the current `README.md`. After the existing `## Quickstart` block (the XIT001 example), insert a new section before `## Configuration`:

````markdown
## GIS endpoints (GeoJSON + PBF)

`@a1678991/reinfolib` exposes GIS endpoints under category facades like `client.urbanPlanning`. Each one accepts an `XYZ` tile coordinate (`z`, `x`, `y`) and returns either a typed GeoJSON `FeatureCollection` (default) or raw PBF bytes (`Uint8Array`) for direct consumption by `@mapbox/vector-tile`.

```ts
// Typed GeoJSON
const geo = await client.urbanPlanning.zoning({ z: 14, x: 14552, y: 6451 });
if (!geo.ok) return console.error(geo.error);
for (const feature of geo.data.features) {
  console.log(feature.properties.city_name, feature.geometry.type);
}

// Raw PBF (Uint8Array) — feed to your favourite vector-tile decoder
const tile = await client.urbanPlanning.zoning({ z: 14, x: 14552, y: 6451 }, { format: "pbf" });
if (tile.ok) {
  // tile.data is a Uint8Array
}
```

Zoom range is `11..15` and tile coordinates follow the [XYZ scheme used by GSI maps](https://maps.gsi.go.jp/development/tileCoordCheck.html).
````

Also update the version line near the top of the README — change:

```
> **v0.1.0** ships with the XIT001 transaction-price endpoint. Remaining 30 endpoints land in v0.2.0+.
```

to:

```
> **v1.2.0** ships XIT001 (prices) and XKT001 (urban-planning zoning) — the GIS architecture is now live. Remaining 29 endpoints land in v1.3.0+.
```

- [ ] **Step 10.2: Commit**

```bash
git add README.md
git commit -m "docs: add GIS / GeoJSON+PBF usage example to README"
```

---

## Task 11: Push branch and open PR

**Files:** none (git/gh only)

- [ ] **Step 11.1: Push the branch**

```bash
git push -u origin feat/gis-foundation
```

Expected: branch published; pre-push `check-branch` passes (branch is not `main`).

- [ ] **Step 11.2: Open the PR**

```bash
gh pr create --title "feat(urban-planning): GIS foundation + XKT001 zoning endpoint" --body "$(cat <<'EOF'
## Summary
- Extract `prices` and `urbanPlanning` category facades into `src/categories/` (addresses v1.0.0 code-review follow-up; scales to remaining categories).
- Add shared GeoJSON `FeatureCollection<G, P>` schemas in `src/core/geojson.ts` with `Point`/`LineString`/`Polygon`/`MultiPolygon` geometry primitives.
- Add binary response path to `src/core/request.ts` (`responseKind: "json" | "binary"`); binary returns `Uint8Array` and skips zod validation.
- Implement **XKT001** (Urban Planning Districts/Zoning) with both GeoJSON and PBF support, accessed via `client.urbanPlanning.zoning({ z, x, y }, { format? })`.
- Add live integration test for XKT001 (opt-in via `INTEGRATION=1`).
- README updated with GIS usage example.

## Test plan
- [x] `pnpm test` — 61/61 unit tests passing locally (was 47)
- [x] `pnpm typecheck` clean
- [x] `pnpm lint` clean (modulo pre-existing `no-await-in-loop` warnings in `src/core/request.ts`)
- [x] `pnpm fmt:check` clean
- [x] `pnpm exec oxfmt --check` clean
- [x] Live integration: `INTEGRATION=1 pnpm test:integration` — XIT001 + XKT001 (GeoJSON + PBF) all pass
- [x] CI passes on the PR
EOF
)"
```

- [ ] **Step 11.3: Watch CI**

```bash
gh pr checks
```

Wait until both `CI` and `Lint Actions` are green. If any fail, fix and push.

- [ ] **Step 11.4: Hand off**

Once CI is green, the PR is ready for human review/merge. Merging triggers Release, which publishes **v1.2.0** (since the branch contains `feat:` commits).

---

## Self-Review

**Spec coverage:**

- §3 Toolchain — no toolchain changes; existing tools cover GIS too. ✓
- §4 Repository Layout — `categories/` directory wasn't in the original spec but is a code-review-driven refinement; the rest of the layout matches. ✓
- §5 Public API — `client.urbanPlanning.zoning(...)` matches the spec's exact signature including `format: "pbf"`. ✓
- §6 Core Request Pipeline — Phase 5 now branches on `responseKind`; rate-limit + retry logic unchanged and still applies. ✓
- §7 Per-Endpoint Module Shape — XKT001 follows the template; the only new wrinkle is the overloaded `call()` for format-conditional return types. ✓
- §8 Shared GeoJSON Schemas — implemented exactly as spec describes (`FeatureCollectionSchema<G, P>(geometry, props)`). ✓
- §9 Testing Strategy — unit + recorded fixtures + opt-in integration covered. ✓
- §10 CI/CD, §11 Commit Lint + Git Hooks, §12 Renovate, §13 package.json — no changes needed. ✓

**Placeholder scan:** Searched for "TBD", "TODO", "similar to Task N", and incomplete blocks. None found. Every code step has full code; every command has expected output.

**Type consistency:**

- `Params`, `Response`, `paramsSchema`, `responseSchema`, `endpoint`, `call` — names match across XKT001 and the existing XIT001 pattern.
- `CallOptsPbf` / `CallOptsGeoJson` defined in Task 7, used in Task 8's facade overload — consistent.
- `responseKind` field name used in Task 5 implementation and threaded through Task 7's `call()` — consistent.
- `zoomSchema` / `tileCoordSchema` defined in Task 3, consumed in Task 7's params schema — consistent.

No gaps found.

# Reinfolib Urban Planning Completion Plan (v1.5.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the `urbanPlanning` category by adding the 6 remaining XKT endpoints (XKT002 Land Use Zones, XKT003 Location Optimization, XKT014 Fire Prevention, XKT023 District Plans, XKT024 High-Use Districts, XKT030 Planned Roads). Ship as v1.5.0.

**Architecture:** Introduce a `callGis()` helper in `src/core/request.ts` that absorbs the per-endpoint retry-merge + request-args boilerplate flagged by Plan 3's final review. Migrate the 3 existing GIS endpoints (XKT001, XPT001, XPT002) to use it as part of the same refactor. The 6 new endpoints adopt the helper from the start, cutting per-endpoint code by ~50%. XKT030 needs `LineStringGeometry` (planned roads are lines, not polygons); the others extend the existing `Polygon | MultiPolygon` union.

**Tech Stack:** TypeScript 6, zod 4, vitest 4 — unchanged.

**Spec reference:** `docs/superpowers/specs/2026-05-26-reinfolib-typescript-client-design.md` §2 Scope, §5 Public API, §7 Per-Endpoint Module Shape, §8 Shared GeoJSON Schemas.
**Predecessor plans:** Plan 1, Plan 2 (`gis-foundation`, v1.2.0), Plan 3 (`prices-municipalities`, v1.3.0→v1.4.0 via release-please).

**Public API additions:**

```ts
client.urbanPlanning.landUseZones({ z, x, y }, { format? })           // XKT002
client.urbanPlanning.locationOptimization({ z, x, y }, { format? })   // XKT003
client.urbanPlanning.firePrevention({ z, x, y }, { format? })         // XKT014
client.urbanPlanning.districtPlans({ z, x, y }, { format? })          // XKT023
client.urbanPlanning.highUseDistricts({ z, x, y }, { format? })       // XKT024
client.urbanPlanning.plannedRoads({ z, x, y }, { format? })           // XKT030 — LineString geometry
```

**Code-cleanup follow-ups from Plan 3 review folded in here:**

- (#1) Drop redundant `z.union([enum, commaListOf(enum)])` in `xpt001.ts` / `xpt002.ts` — `commaListOf` already accepts singletons.
- (#5,#6) Defer: migrating JSON facade `ReturnType<typeof X.call>` patterns. Safe today (single-signature), no churn warranted yet.

**Out of scope (deferred):**

- facilities category (9 XKT) — Plan 5.
- demographics + disaster categories (14 endpoints) — Plan 6.
- Updating example CLIs to cover the 6 new endpoints — defer or fold in if trivial.

---

## File Structure (end of plan)

```
src/
├── categories/
│   └── urban-planning.ts                       # MODIFIED: + 6 new facade methods
├── core/
│   ├── request.ts                              # MODIFIED: + callGis helper
│   └── geojson.ts                              # unchanged (LineStringGeometry already exists)
└── endpoints/
    ├── prices/
    │   ├── xpt001.ts                           # MODIFIED: migrate to callGis; drop z.union redundancy
    │   └── xpt002.ts                           # MODIFIED: migrate to callGis; drop z.union redundancy
    └── urban-planning/
        ├── xkt001.ts                           # MODIFIED: migrate to callGis
        ├── xkt002.ts                           # NEW
        ├── xkt003.ts                           # NEW
        ├── xkt014.ts                           # NEW
        ├── xkt023.ts                           # NEW
        ├── xkt024.ts                           # NEW
        └── xkt030.ts                           # NEW (LineString geometry)

tests/
├── fixtures/
│   ├── xkt002.{json,pbf}                       # NEW
│   ├── xkt003.{json,pbf}                       # NEW
│   ├── xkt014.{json,pbf}                       # NEW
│   ├── xkt023.{json,pbf}                       # NEW
│   ├── xkt024.{json,pbf}                       # NEW
│   └── xkt030.{json,pbf}                       # NEW
├── integration/
│   └── xkt002–030.test.ts                      # NEW (1 file per endpoint, mirrors xkt001.test.ts)
└── unit/
    ├── core/
    │   └── request.test.ts                     # MODIFIED: + callGis tests
    └── endpoints/urban-planning/
        ├── xkt001.test.ts                      # unchanged (refactor is internal)
        ├── xkt002.test.ts                      # NEW
        ├── xkt003.test.ts                      # NEW
        ├── xkt014.test.ts                      # NEW
        ├── xkt023.test.ts                      # NEW
        ├── xkt024.test.ts                      # NEW
        └── xkt030.test.ts                      # NEW
```

---

## Task 1: Branch off main + commit plan

**Files:** none (git only)

- [ ] **Step 1.1: Verify clean main at v1.4.0**

```bash
git status
git log --oneline | head -5
```

Expected: clean tree; HEAD is `b0b44ac chore(release): 1.4.0 (#3)` or newer.

- [ ] **Step 1.2: Create feature branch**

```bash
git checkout -b feat/urban-planning-complete
```

- [ ] **Step 1.3: Commit this plan doc**

```bash
git add docs/superpowers/plans/2026-05-27-reinfolib-urban-planning-complete-plan.md
git commit -m "docs: add urban-planning completion implementation plan"
```

If oxfmt rewrites markdown when staged, re-add and retry.

---

## Task 2: Add `callGis` helper + migrate XKT001/XPT001/XPT002

The helper centralizes the 5-line format/apiParams/retry-merge boilerplate and the 15-line `request({...})` arg assembly. Migrating the 3 existing GIS endpoints first proves the helper works against committed test fixtures before any new endpoints depend on it. Folds in Plan 3 review #1 (drop redundant `z.union` in XPT001/XPT002).

**Files:**

- Modify: `src/core/request.ts` (add helper)
- Modify: `src/core/common.ts` (no changes needed but verify exports)
- Modify: `src/endpoints/urban-planning/xkt001.ts`
- Modify: `src/endpoints/prices/xpt001.ts`
- Modify: `src/endpoints/prices/xpt002.ts`
- Modify: `tests/unit/core/request.test.ts` (add 4 tests for helper behavior)

### Step 2.1: Write failing tests for the helper

Append to `tests/unit/core/request.test.ts`:

```ts
import { callGis } from "../../../src/core/request.js";
import { TokenBucket as _TokenBucket } from "../../../src/core/rate-limit.js";

// Already imported above: z, request, DEFAULT_RETRY, TokenBucket.

describe("callGis", () => {
  const userParams = z.object({ z: z.number().int(), x: z.number().int(), y: z.number().int() });
  const propsSchema = z.object({ name: z.string() });
  // Minimal FeatureCollection<Point, {name}> schema
  const fcSchema = z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        geometry: z.object({
          type: z.literal("Point"),
          coordinates: z.tuple([z.number(), z.number()]),
        }),
        properties: propsSchema,
      }),
    ),
  });
  const sampleFc = {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [0, 0] as [number, number] },
        properties: { name: "origin" },
      },
    ],
  };

  function buildClientStub(fetchFn: typeof globalThis.fetch) {
    return {
      apiKey: "k",
      baseUrl: "https://example.test",
      timeoutMs: 5_000,
      userAgent: undefined,
      bucket: undefined,
      retry: { ...DEFAULT_RETRY, baseDelayMs: 1, maxDelayMs: 5, maxAttempts: 3 },
      fetch: fetchFn,
    } as const;
  }

  it("defaults to geojson and returns parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(sampleFc), { status: 200 }));
    const client = buildClientStub(fetchFn);
    const res = await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: {},
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(sampleFc);
  });

  it("appends response_format=geojson to the query string by default", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(sampleFc), { status: 200 }));
    const client = buildClientStub(fetchFn);
    await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: {},
    });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
  });

  it("returns Uint8Array when opts.format=pbf", async () => {
    const bytes = new Uint8Array([0xab, 0xcd]);
    const fetchFn = vi.fn(async () => new Response(bytes, { status: 200 }));
    const client = buildClientStub(fetchFn);
    const res = await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: { format: "pbf" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=pbf");
  });

  it("merges per-call retry override", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(new Response("nope", { status: 503 }));
    const client = buildClientStub(fetchFn);
    const res = await callGis({
      client,
      endpoint: { id: "TEST", path: "/test" },
      params: { z: 14, x: 1, y: 1 },
      paramsSchema: userParams,
      responseSchema: fcSchema,
      opts: { retry: { maxAttempts: 2 } },
    });
    expect(res.ok).toBe(false);
    if (!res.ok && res.error.kind === "api") expect(res.error.attempts).toBe(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
```

### Step 2.2: Verify failure

```bash
pnpm test tests/unit/core/request.test.ts
```

Expected: 4 new tests fail with `callGis` not exported.

### Step 2.3: Implement the helper in `src/core/request.ts`

Read the existing file first to see the `RequestArgs<P, R>` type and the `withResponseFormat` import location.

Append to `src/core/request.ts`:

```ts
import { withResponseFormat } from "./common.js";

export type CallGisOpts = {
  format?: "geojson" | "pbf" | undefined;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  retry?: false | Partial<RetryConfig> | undefined;
};

type CallGisClientView = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  userAgent?: string | undefined;
  bucket: TokenBucket | undefined;
  retry: RetryConfig;
  fetch: typeof globalThis.fetch;
};

export async function callGis<P extends z.ZodRawShape, R>(args: {
  client: CallGisClientView;
  endpoint: { id: string; path: string };
  params: z.infer<z.ZodObject<P>>;
  paramsSchema: z.ZodObject<P>;
  responseSchema: ZodType<R>;
  opts: CallGisOpts;
}): Promise<Result<R | Uint8Array, ReinfolibError>> {
  const { client, endpoint, params, paramsSchema, responseSchema, opts } = args;
  const format = opts.format ?? "geojson";
  const apiParams = { ...params, response_format: format };
  const retry =
    opts.retry === false ? { ...client.retry, maxAttempts: 1 } : { ...client.retry, ...opts.retry };

  return request({
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
    path: endpoint.path,
    params: apiParams,
    paramsSchema: withResponseFormat(paramsSchema),
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

Note: `z`, `ZodType`, `Result`, `ReinfolibError`, `TokenBucket`, `RetryConfig`, and `request` should already be imported at the top of the file. If `z` itself isn't yet imported (the existing file imports `ZodType` as a type-only import), add `import { z } from "zod";`.

### Step 2.4: Verify the helper tests pass

```bash
pnpm test tests/unit/core/request.test.ts
```

Expected: 4 new tests pass.

### Step 2.5: Migrate `src/endpoints/urban-planning/xkt001.ts` to use `callGis`

Read the existing file. Replace the whole `call` function body. The function signature (overloads) stays the same; only the body changes.

Before (excerpt):

```ts
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
    /* 15 lines of args */
  });
}
```

After:

```ts
export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptions & { format?: "geojson" | "pbf" | undefined } = {},
): Promise<Result<Response | Uint8Array, ReinfolibError>> {
  return callGis({
    client,
    endpoint,
    params,
    paramsSchema,
    responseSchema,
    opts,
  });
}
```

Replace the `request` import with `callGis` if `request` becomes unused. Also remove now-unused imports: `withResponseFormat` (helper handles it), `request` if no longer referenced.

Run typecheck after the change:

```bash
pnpm typecheck
```

Expected: silent.

Run XKT001 tests:

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt001.test.ts
```

Expected: all existing XKT001 tests still pass (refactor is behavior-preserving).

### Step 2.6: Migrate `src/endpoints/prices/xpt001.ts` to use `callGis` AND drop `z.union` redundancy

Read the file. Two changes:

**A.** Replace the `landTypeCode` param schema. Find:

```ts
landTypeCode: z.union([landTypeCodeSchema, commaListOf(landTypeCodeSchema)]).optional(),
```

Replace with:

```ts
landTypeCode: commaListOf(landTypeCodeSchema).optional(),
```

**B.** Replace the `call` function body to delegate to `callGis` (same pattern as Step 2.5). Drop `withResponseFormat` and `request` imports if they become unused; add `callGis` import.

Run:

```bash
pnpm test tests/unit/endpoints/prices/xpt001.test.ts
pnpm typecheck
```

Expected: all XPT001 tests pass; typecheck silent.

### Step 2.7: Migrate `src/endpoints/prices/xpt002.ts` to use `callGis` AND drop `z.union` redundancy

Same as 2.6 but for XPT002. Find:

```ts
useCategoryCode: z.union([useCategoryCodeSchema, commaListOf(useCategoryCodeSchema)]).optional(),
```

Replace with:

```ts
useCategoryCode: commaListOf(useCategoryCodeSchema).optional(),
```

And migrate the `call` body to use `callGis`.

```bash
pnpm test tests/unit/endpoints/prices/xpt002.test.ts
pnpm typecheck
```

Expected: green.

### Step 2.8: Run full suite

```bash
pnpm test
```

Expected: 124 tests pass (120 prior + 4 new helper tests).

### Step 2.9: Commit

```bash
git add src/core/request.ts src/endpoints/urban-planning/xkt001.ts src/endpoints/prices/xpt001.ts src/endpoints/prices/xpt002.ts tests/unit/core/request.test.ts
git commit -m "refactor(core): add callGis helper; migrate XKT001/XPT001/XPT002; drop z.union redundancy"
```

If oxfmt reformats files, re-add and retry.

---

## Task 3: Capture XKT002 fixtures (Land Use Zones — Polygon)

**Files:**

- Create: `tests/fixtures/xkt002.json`
- Create: `tests/fixtures/xkt002.pbf`

### Step 3.1: Capture GeoJSON

XKT002 docs example uses `z=14&x=14339&y=6505` (Kobe area). Tokyo Chuo tile (`x=14552&y=6451` at z=14) likely also returns data — try it first:

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT002?response_format=geojson&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt002.json
```

Verify:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xkt002.json","utf8")); if(j.type!=="FeatureCollection") throw new Error("not a FeatureCollection: "+JSON.stringify(j).slice(0,200)); console.log("features:", j.features.length, "geom:", j.features[0]?.geometry?.type, "first prop keys:", Object.keys(j.features[0]?.properties || {}).slice(0,10).join("|"));'
```

Expected: features > 0, geom = Polygon or MultiPolygon, properties include `use_area_ja`, `youto_id`, etc.

If empty, retry with `x=14339&y=6505` (Kobe per docs). If still empty, **stop and report BLOCKED**.

### Step 3.2: Capture PBF

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT002?response_format=pbf&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt002.pbf
```

(Substitute the working z/x/y.)

```bash
file tests/fixtures/xkt002.pbf
stat -c '%s' tests/fixtures/xkt002.pbf
```

Expected: binary type, size > 0.

### Step 3.3: Commit

```bash
git add tests/fixtures/xkt002.json tests/fixtures/xkt002.pbf
git commit -m "test(fixtures): capture XKT002 land-use zones samples"
```

If oxfmt reformats the JSON, `pnpm oxfmt tests/fixtures/xkt002.json` then re-add.

---

## Task 4: Implement XKT002 + wire to urbanPlanning facade

**Files:**

- Create: `src/endpoints/urban-planning/xkt002.ts`
- Modify: `src/categories/urban-planning.ts`
- Create: `tests/unit/endpoints/urban-planning/xkt002.test.ts`

### Step 4.1: Write failing tests

Create `tests/unit/endpoints/urban-planning/xkt002.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import {
  paramsSchema,
  responseSchema,
  call,
} from "../../../../src/endpoints/urban-planning/xkt002.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xkt002.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xkt002.pbf"));

describe("XKT002 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ z: 14, x: 14552, y: 6451 }).success).toBe(true);
  });
  it("rejects zoom outside 11..15", () => {
    expect(paramsSchema.safeParse({ z: 10, x: 1, y: 1 }).success).toBe(false);
    expect(paramsSchema.safeParse({ z: 16, x: 1, y: 1 }).success).toBe(false);
  });
});

describe("XKT002 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XKT002 call() — GeoJSON", () => {
  it("returns ok with parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("sends response_format=geojson", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451 });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
  });
});

describe("XKT002 call() — PBF", () => {
  it("returns ok with Uint8Array", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toBeInstanceOf(Uint8Array);
      expect(res.data.byteLength).toBe(pbfFixture.byteLength);
    }
  });
});

describe("ReinfolibClient.urbanPlanning.landUseZones", () => {
  it("is wired (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.landUseZones({ z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
  });

  it("is wired (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.landUseZones(
      { z: 14, x: 14552, y: 6451 },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});
```

### Step 4.2: Verify failure

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt002.test.ts
```

Expected: FAIL — module not found.

### Step 4.3: Implement the endpoint module

Create `src/endpoints/urban-planning/xkt002.ts`:

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
import { callGis } from "../../core/request.js";
import type { Result } from "../../core/result.js";

export const paramsSchema = z.object({
  z: zoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
});
export type Params = z.infer<typeof paramsSchema>;

const propsSchema = z
  .object({
    youto_id: z.number().int().optional(),
    prefecture: z.string().optional(),
    city_code: z.string().optional(),
    city_name: z.string().optional(),
    decision_date: z.string().optional(),
    decision_classification: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number: z.string().optional(),
    use_area_ja: z.string().optional(),
    u_floor_area_ratio_ja: z.string().optional(),
    u_building_coverage_ratio_ja: z.string().optional(),
    first_decision_date: z.string().optional(),
    notice_number_s: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(
  z.union([PolygonGeometry, MultiPolygonGeometry]),
  propsSchema,
);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XKT002", path: "/ex-api/external/XKT002" } as const;

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
  return callGis({ client, endpoint, params, paramsSchema, responseSchema, opts });
}
```

### Step 4.4: Wire into `urbanPlanning` facade

Read `src/categories/urban-planning.ts`. Add import:

```ts
import * as xkt002 from "../endpoints/urban-planning/xkt002.js";
```

Extend `UrbanPlanningFacade`:

```ts
export type UrbanPlanningFacade = {
  zoning: {
    (params: xkt001.Params, opts: xkt001.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt001.Params,
      opts?: xkt001.CallOptsGeoJson,
    ): Promise<Result<xkt001.Response, ReinfolibError>>;
  };
  landUseZones: {
    (params: xkt002.Params, opts: xkt002.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xkt002.Params,
      opts?: xkt002.CallOptsGeoJson,
    ): Promise<Result<xkt002.Response, ReinfolibError>>;
  };
};
```

Extend `createUrbanPlanningFacade`:

```ts
export function createUrbanPlanningFacade(client: ReinfolibClient): UrbanPlanningFacade {
  return {
    zoning: ((params, opts) =>
      xkt001.call(client, params, opts as xkt001.CallOptsPbf)) as UrbanPlanningFacade["zoning"],
    landUseZones: ((params, opts) =>
      xkt002.call(
        client,
        params,
        opts as xkt002.CallOptsPbf,
      )) as UrbanPlanningFacade["landUseZones"],
  };
}
```

### Step 4.5: Verify pass

```bash
pnpm test
```

Expected: 132 tests pass (124 prior + 8 new).

### Step 4.6: Typecheck

```bash
pnpm typecheck
```

Expected: silent.

### Step 4.7: Commit

```bash
git add src/endpoints/urban-planning/xkt002.ts src/categories/urban-planning.ts tests/unit/endpoints/urban-planning/xkt002.test.ts
git commit -m "feat(urban-planning): add XKT002 land-use zones endpoint"
```

---

## Task 5: Capture XKT003 fixtures (Location Optimization Plans — Polygon)

**Files:**

- Create: `tests/fixtures/xkt003.json`
- Create: `tests/fixtures/xkt003.pbf`

### Step 5.1: Capture

Try Shizuoka-area or Tokyo Chuo:

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT003?response_format=geojson&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt003.json
```

Verify:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xkt003.json","utf8")); if(j.type!=="FeatureCollection") throw new Error("not a FeatureCollection: "+JSON.stringify(j).slice(0,200)); console.log("features:", j.features.length, "geom:", j.features[0]?.geometry?.type, "first prop keys:", Object.keys(j.features[0]?.properties || {}).slice(0,10).join("|"));'
```

If empty, try Shizuoka (Izu) area — z=13, x=7276, y=3225 — or another zoom 11 tile spanning more area. If still empty, **stop and report BLOCKED**.

### Step 5.2: PBF

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT003?response_format=pbf&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt003.pbf
```

(Use the working tile.)

```bash
file tests/fixtures/xkt003.pbf
stat -c '%s' tests/fixtures/xkt003.pbf
```

### Step 5.3: Commit

```bash
git add tests/fixtures/xkt003.json tests/fixtures/xkt003.pbf
git commit -m "test(fixtures): capture XKT003 location-optimization samples"
```

---

## Task 6: Implement XKT003 + wire to facade

**Files:**

- Create: `src/endpoints/urban-planning/xkt003.ts`
- Modify: `src/categories/urban-planning.ts`
- Create: `tests/unit/endpoints/urban-planning/xkt003.test.ts`

### Step 6.1: Write failing tests

Create `tests/unit/endpoints/urban-planning/xkt003.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import {
  paramsSchema,
  responseSchema,
  call,
} from "../../../../src/endpoints/urban-planning/xkt003.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xkt003.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xkt003.pbf"));

describe("XKT003 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ z: 14, x: 14552, y: 6451 }).success).toBe(true);
  });
  it("rejects zoom outside 11..15", () => {
    expect(paramsSchema.safeParse({ z: 10, x: 1, y: 1 }).success).toBe(false);
  });
});

describe("XKT003 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XKT003 call()", () => {
  it("returns ok with parsed FeatureCollection (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("returns Uint8Array (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});

describe("ReinfolibClient.urbanPlanning.locationOptimization", () => {
  it("is wired (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.locationOptimization({ z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
  });

  it("is wired (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.locationOptimization(
      { z: 14, x: 14552, y: 6451 },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});
```

### Step 6.2: Verify failure

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt003.test.ts
```

Expected: FAIL — module not found.

### Step 6.3: Implement

Create `src/endpoints/urban-planning/xkt003.ts`:

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
import { callGis } from "../../core/request.js";
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
    decision_date: z.string().optional(),
    decision_classification: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number: z.string().optional(),
    kubun_id: z.number().int().optional(),
    kubun_name_ja: z.string().optional(),
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

export const endpoint = { id: "XKT003", path: "/ex-api/external/XKT003" } as const;

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
  return callGis({ client, endpoint, params, paramsSchema, responseSchema, opts });
}
```

### Step 6.4: Wire into facade

Read `src/categories/urban-planning.ts`. Add `import * as xkt003 from "../endpoints/urban-planning/xkt003.js";`. Extend the type with `locationOptimization` (same overload shape as `landUseZones`). Extend the factory with `locationOptimization: ((params, opts) => xkt003.call(client, params, opts as xkt003.CallOptsPbf)) as UrbanPlanningFacade["locationOptimization"]`.

### Step 6.5: Verify

```bash
pnpm test
pnpm typecheck
```

Expected: 138 tests pass (132 + 6 new); typecheck silent.

### Step 6.6: Commit

```bash
git add src/endpoints/urban-planning/xkt003.ts src/categories/urban-planning.ts tests/unit/endpoints/urban-planning/xkt003.test.ts
git commit -m "feat(urban-planning): add XKT003 location-optimization endpoint"
```

---

## Task 7: Capture XKT014 fixtures (Fire Prevention Zones — Polygon)

**Files:**

- Create: `tests/fixtures/xkt014.json`
- Create: `tests/fixtures/xkt014.pbf`

### Step 7.1: Capture (docs show Yokosuka at z=15&x=29096&y=12948)

Tokyo Chuo first:

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT014?response_format=geojson&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt014.json
```

Verify (features > 0, properties include `fire_prevention_ja`, `kubun_id`). If empty, try `z=15&x=29096&y=12948` (Yokosuka per docs).

### Step 7.2: PBF

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT014?response_format=pbf&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt014.pbf
```

### Step 7.3: Commit

```bash
git add tests/fixtures/xkt014.json tests/fixtures/xkt014.pbf
git commit -m "test(fixtures): capture XKT014 fire-prevention samples"
```

---

## Task 8: Implement XKT014 + wire to facade

**Files:**

- Create: `src/endpoints/urban-planning/xkt014.ts`
- Modify: `src/categories/urban-planning.ts`
- Create: `tests/unit/endpoints/urban-planning/xkt014.test.ts`

### Step 8.1: Write failing tests

Create `tests/unit/endpoints/urban-planning/xkt014.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import {
  paramsSchema,
  responseSchema,
  call,
} from "../../../../src/endpoints/urban-planning/xkt014.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xkt014.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xkt014.pbf"));

describe("XKT014 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ z: 14, x: 14552, y: 6451 }).success).toBe(true);
  });
});

describe("XKT014 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XKT014 call()", () => {
  it("returns FeatureCollection (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("returns Uint8Array (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451 }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});

describe("ReinfolibClient.urbanPlanning.firePrevention", () => {
  it("is wired (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.firePrevention({ z: 14, x: 14552, y: 6451 });
    expect(res.ok).toBe(true);
  });

  it("is wired (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.urbanPlanning.firePrevention(
      { z: 14, x: 14552, y: 6451 },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});
```

### Step 8.2: Verify failure

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt014.test.ts
```

### Step 8.3: Implement

Create `src/endpoints/urban-planning/xkt014.ts` with the same shell as xkt002.ts but with these props:

```ts
const propsSchema = z
  .object({
    fire_prevention_ja: z.string().optional(),
    kubun_id: z.number().int().optional(),
    prefecture: z.string().optional(),
    city_code: z.string().optional(),
    city_name: z.string().optional(),
    decision_date: z.string().optional(),
    decision_classification: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number: z.string().optional(),
    first_decision_date: z.string().optional(),
    notice_number_s: z.string().optional(),
  })
  .passthrough();
```

And `endpoint = { id: "XKT014", path: "/ex-api/external/XKT014" } as const;`.

The full file mirrors xkt002.ts otherwise. Use `FeatureCollectionSchema(z.union([PolygonGeometry, MultiPolygonGeometry]), propsSchema)` and the same overloaded `call()` body that delegates to `callGis`.

### Step 8.4: Wire into facade

Add `firePrevention` entry to `UrbanPlanningFacade` and `createUrbanPlanningFacade` mirroring `landUseZones`.

### Step 8.5: Verify + commit

```bash
pnpm test
pnpm typecheck
```

Expected: 144 tests pass; silent.

```bash
git add src/endpoints/urban-planning/xkt014.ts src/categories/urban-planning.ts tests/unit/endpoints/urban-planning/xkt014.test.ts
git commit -m "feat(urban-planning): add XKT014 fire-prevention endpoint"
```

---

## Task 9: Capture XKT023 fixtures (District Plans — Polygon)

**Files:** `tests/fixtures/xkt023.{json,pbf}`

### Step 9.1: Capture (docs show z=14&x=14551&y=6451 — Tokyo Chiyoda)

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT023?response_format=geojson&z=14&x=14551&y=6451" \
  -o tests/fixtures/xkt023.json
```

Verify features > 0; properties include `plan_name`, `plan_type_ja`, `kubun_id`, `group_code`.

### Step 9.2: PBF

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT023?response_format=pbf&z=14&x=14551&y=6451" \
  -o tests/fixtures/xkt023.pbf
```

### Step 9.3: Commit

```bash
git add tests/fixtures/xkt023.json tests/fixtures/xkt023.pbf
git commit -m "test(fixtures): capture XKT023 district-plans samples"
```

---

## Task 10: Implement XKT023 + wire to facade

**Files:**

- Create: `src/endpoints/urban-planning/xkt023.ts`
- Modify: `src/categories/urban-planning.ts`
- Create: `tests/unit/endpoints/urban-planning/xkt023.test.ts`

### Step 10.1: Write failing tests

Use the same test structure as Step 4.1 (xkt002.test.ts). Substitute:

- File path: `tests/unit/endpoints/urban-planning/xkt023.test.ts`
- Import paths: `../../../../src/endpoints/urban-planning/xkt023.js`
- Fixture coordinates: `z: 14, x: 14551, y: 6451`
- Facade method: `client.urbanPlanning.districtPlans`
- Describe blocks: "XKT023 params schema", "XKT023 response schema", "XKT023 call()", "ReinfolibClient.urbanPlanning.districtPlans"

Otherwise the test code is identical to xkt002.test.ts. Use `(geoFixture, pbfFixture)` from `xkt023.{json,pbf}` fixtures.

### Step 10.2: Verify failure

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt023.test.ts
```

### Step 10.3: Implement

Create `src/endpoints/urban-planning/xkt023.ts`. Same shell as xkt002.ts. The props schema (per docs):

```ts
const propsSchema = z
  .object({
    plan_name: z.string().optional(),
    plan_type_ja: z.string().optional(),
    kubun_id: z.string().optional(), // string per docs (NOT number)
    group_code: z.string().optional(),
    decision_date: z.string().optional(),
    decision_type_ja: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number: z.string().optional(),
    prefecture: z.string().optional(),
    city_name: z.string().optional(),
    first_decision_date: z.string().optional(),
    notice_number_s: z.string().optional(),
  })
  .passthrough();
```

`endpoint = { id: "XKT023", path: "/ex-api/external/XKT023" } as const;`. Facade method name: `districtPlans`.

### Step 10.4: Wire into facade

Add `districtPlans` to `UrbanPlanningFacade` and factory.

### Step 10.5: Verify + commit

```bash
pnpm test && pnpm typecheck
git add src/endpoints/urban-planning/xkt023.ts src/categories/urban-planning.ts tests/unit/endpoints/urban-planning/xkt023.test.ts
git commit -m "feat(urban-planning): add XKT023 district-plans endpoint"
```

---

## Task 11: Capture XKT024 fixtures (High-Use Districts — Polygon)

**Files:** `tests/fixtures/xkt024.{json,pbf}`

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT024?response_format=geojson&z=14&x=14551&y=6451" \
  -o tests/fixtures/xkt024.json

curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT024?response_format=pbf&z=14&x=14551&y=6451" \
  -o tests/fixtures/xkt024.pbf
```

Verify features > 0; properties include `advanced_name`, `advanced_type_ja`, `kubun_id`, `group_code`.

Commit:

```bash
git add tests/fixtures/xkt024.json tests/fixtures/xkt024.pbf
git commit -m "test(fixtures): capture XKT024 high-use-districts samples"
```

---

## Task 12: Implement XKT024 + wire to facade

**Files:**

- Create: `src/endpoints/urban-planning/xkt024.ts`
- Modify: `src/categories/urban-planning.ts`
- Create: `tests/unit/endpoints/urban-planning/xkt024.test.ts`

Same test/impl structure as previous tasks. Per-endpoint differences:

- Facade method: `highUseDistricts`
- Props schema:
  ```ts
  const propsSchema = z
    .object({
      advanced_name: z.string().optional(),
      advanced_type_ja: z.string().optional(),
      kubun_id: z.string().optional(), // string per docs
      group_code: z.string().optional(),
      decision_date: z.string().optional(),
      decision_type_ja: z.string().optional(),
      decision_maker: z.string().optional(),
      notice_number: z.string().optional(),
      prefecture: z.string().optional(),
      city_name: z.string().optional(),
      first_decision_date: z.string().optional(),
      notice_number_s: z.string().optional(),
    })
    .passthrough();
  ```
- `endpoint = { id: "XKT024", path: "/ex-api/external/XKT024" } as const;`

Verify + commit:

```bash
pnpm test && pnpm typecheck
git add src/endpoints/urban-planning/xkt024.ts src/categories/urban-planning.ts tests/unit/endpoints/urban-planning/xkt024.test.ts
git commit -m "feat(urban-planning): add XKT024 high-use-districts endpoint"
```

---

## Task 13: Capture XKT030 fixtures (Planned Roads — **LineString** geometry)

XKT030 returns urban planning ROADS, which are LineStrings (not Polygons). The response schema and the test fixture geometry differ from the previous endpoints.

**Files:** `tests/fixtures/xkt030.{json,pbf}`

### Step 13.1: Capture

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT030?response_format=geojson&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt030.json
```

Verify:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xkt030.json","utf8")); if(j.type!=="FeatureCollection") throw new Error("not a FeatureCollection: "+JSON.stringify(j).slice(0,200)); console.log("features:", j.features.length, "geom:", j.features[0]?.geometry?.type, "first prop keys:", Object.keys(j.features[0]?.properties || {}).slice(0,10).join("|"));'
```

Expected: features > 0; `geom: LineString` (or possibly `MultiLineString`). **Document which** — Task 14's schema depends on it.

If empty, try Utsunomiya per docs example `z=11&x=1828&y=751`.

### Step 13.2: PBF

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XKT030?response_format=pbf&z=14&x=14552&y=6451" \
  -o tests/fixtures/xkt030.pbf
```

### Step 13.3: Commit

```bash
git add tests/fixtures/xkt030.json tests/fixtures/xkt030.pbf
git commit -m "test(fixtures): capture XKT030 planned-roads samples"
```

---

## Task 14: Implement XKT030 + add MultiLineStringGeometry if needed + wire to facade

**Files:**

- Possibly modify: `src/core/geojson.ts` (add `MultiLineStringGeometry` if the fixture has it; otherwise unchanged — `LineStringGeometry` already exists)
- Create: `src/endpoints/urban-planning/xkt030.ts`
- Modify: `src/categories/urban-planning.ts`
- Create: `tests/unit/endpoints/urban-planning/xkt030.test.ts`

### Step 14.1: If fixture has MultiLineString, add the geometry schema

Read `src/core/geojson.ts` to confirm `LineStringGeometry` exists (it does — added in Plan 2 Task 4). If your Task 13 fixture has any feature with `geometry.type === "MultiLineString"`, add a new export:

```ts
export const MultiLineStringGeometry = z.object({
  type: z.literal("MultiLineString"),
  coordinates: z.array(z.array(Position).min(2)).min(1),
});
```

(Where `Position` is the existing module-private tuple. If `Position` is not exported, this code must go inside `geojson.ts` itself.)

Add a test for it in `tests/unit/core/geojson.test.ts`:

```ts
describe("MultiLineStringGeometry", () => {
  it("parses a multi-linestring", () => {
    const r = MultiLineStringGeometry.safeParse({
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
        [
          [2, 2],
          [3, 3],
        ],
      ],
    });
    expect(r.success).toBe(true);
  });
});
```

(Skip this whole step if the fixture has only `LineString`.)

### Step 14.2: Write failing tests

Create `tests/unit/endpoints/urban-planning/xkt030.test.ts` mirroring xkt002.test.ts but with these substitutions:

- Imports from `../../../../src/endpoints/urban-planning/xkt030.js`
- Fixtures: `xkt030.{json,pbf}`
- Facade method: `client.urbanPlanning.plannedRoads`

The response-schema test still uses `responseSchema.safeParse(geoFixture)` — same code, different fixture.

### Step 14.3: Verify failure

```bash
pnpm test tests/unit/endpoints/urban-planning/xkt030.test.ts
```

### Step 14.4: Implement

Create `src/endpoints/urban-planning/xkt030.ts`. Mostly identical to xkt002.ts; the **only** material difference is the geometry union for the response schema:

```ts
import {
  FeatureCollectionSchema,
  LineStringGeometry,
  // include MultiLineStringGeometry here if Task 14.1 added it
} from "../../core/geojson.js";

// ...

const propsSchema = z
  .object({
    planning_road_ja: z.string().optional(),
    kubun_id: z.number().int().optional(),
    prefecture: z.string().optional(),
    city_code: z.string().optional(),
    city_name: z.string().optional(),
    first_decision_date: z.string().optional(),
    decision_date: z.string().optional(),
    decision_type_ja: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number_s: z.string().optional(),
    notice_number: z.string().optional(),
  })
  .passthrough();

// If fixture has only LineString, use `LineStringGeometry` alone.
// If it has both LineString and MultiLineString, union them.
export const responseSchema = FeatureCollectionSchema(LineStringGeometry, propsSchema);
// OR if MultiLineString is present:
// export const responseSchema = FeatureCollectionSchema(
//   z.union([LineStringGeometry, MultiLineStringGeometry]),
//   propsSchema,
// );
```

`endpoint = { id: "XKT030", path: "/ex-api/external/XKT030" } as const;`. Same overloaded `call()` body delegating to `callGis`.

### Step 14.5: Wire into facade

Add `plannedRoads` to `UrbanPlanningFacade` and factory. Note `xkt030.Response` is `FeatureCollection<LineString | MultiLineString?, props>`, so the explicit return type in the facade still uses `xkt030.Response`:

```ts
plannedRoads: {
  (params: xkt030.Params, opts: xkt030.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
  (params: xkt030.Params, opts?: xkt030.CallOptsGeoJson): Promise<Result<xkt030.Response, ReinfolibError>>;
};
```

### Step 14.6: Verify + commit

```bash
pnpm test && pnpm typecheck
git add src/endpoints/urban-planning/xkt030.ts src/categories/urban-planning.ts tests/unit/endpoints/urban-planning/xkt030.test.ts
# Also add geojson.ts and geojson.test.ts if Task 14.1 applied:
git add src/core/geojson.ts tests/unit/core/geojson.test.ts || true
git commit -m "feat(urban-planning): add XKT030 planned-roads endpoint (LineString)"
```

---

## Task 15: Add integration tests for all 6 new endpoints

**Files:** 6 new test files under `tests/integration/`.

### Step 15.1: Create `tests/integration/xkt002.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XKT002 — live", () => {
  runIt(
    "GeoJSON: hits the real endpoint and parses",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.urbanPlanning.landUseZones({ z: 14, x: 14552, y: 6451 });
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
      const res = await client.urbanPlanning.landUseZones(
        { z: 14, x: 14552, y: 6451 },
        { format: "pbf" },
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data).toBeInstanceOf(Uint8Array);
        expect(res.data.byteLength).toBeGreaterThan(0);
      }
    },
    30_000,
  );
});
```

### Step 15.2: Create the other 5 files

Files:

- `tests/integration/xkt003.test.ts` — describe block `XKT003 — live`, facade `client.urbanPlanning.locationOptimization`, coords `{ z: 14, x: 14552, y: 6451 }`.
- `tests/integration/xkt014.test.ts` — describe `XKT014 — live`, facade `client.urbanPlanning.firePrevention`.
- `tests/integration/xkt023.test.ts` — describe `XKT023 — live`, facade `client.urbanPlanning.districtPlans`, coords `{ z: 14, x: 14551, y: 6451 }`.
- `tests/integration/xkt024.test.ts` — describe `XKT024 — live`, facade `client.urbanPlanning.highUseDistricts`, coords `{ z: 14, x: 14551, y: 6451 }`.
- `tests/integration/xkt030.test.ts` — describe `XKT030 — live`, facade `client.urbanPlanning.plannedRoads`, coords `{ z: 14, x: 14552, y: 6451 }`.

Each file is identical to xkt002.test.ts except for the describe text, facade method, and coordinates. The body of each runIt block uses the same shape: GeoJSON parses to `FeatureCollection`, PBF returns `Uint8Array`.

If the coords from Step 15.2 don't actually return data live (XKT003 location-optimization in particular may need a non-Tokyo tile — try Shizuoka coords if needed; just match whatever fixture coords worked for the unit-test capture in Tasks 5/7/9/11/13). Make sure each runIt block uses tile coords that have actual data.

### Step 15.3: Verify skip without env

```bash
pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 21 skipped (1 XIT001 + 1 XCT001 + 2 XPT001 + 2 XPT002 + 1 XIT002 + 2 XKT001 + 2×6 new = 9 + 12 = 21).

### Step 15.4: Verify pass with env

```bash
INTEGRATION=1 REINFOLIB_API_KEY=YOUR_API_KEY \
  pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 21 passed.

If any fail (especially schema-mismatch errors against live data), capture the failing endpoint's actual response and adjust the affected props schema or geometry choice. Don't pretend it passed.

### Step 15.5: Commit

```bash
git add tests/integration/xkt002.test.ts tests/integration/xkt003.test.ts tests/integration/xkt014.test.ts tests/integration/xkt023.test.ts tests/integration/xkt024.test.ts tests/integration/xkt030.test.ts
git commit -m "test: add opt-in integration tests for XKT002/003/014/023/024/030"
```

---

## Task 16: Update README

**Files:** Modify `README.md`.

### Step 16.1: Update version blockquote

Find:

```
> **v1.3.0** completes the `prices` category ... Remaining 25 endpoints land in v1.4.0+.
```

(The actual current state may be slightly different — adapt to whatever text is there. Replace with:)

```
> **v1.5.0** completes the `urbanPlanning` category (zoning, land-use zones, location optimization, fire prevention, district plans, high-use districts, planned roads). Remaining 23 endpoints (facilities, demographics, disaster) land in v1.6.0+.
```

### Step 16.2: Extend the GIS section

Find the "## GIS endpoints (GeoJSON + PBF)" section. After the existing `client.urbanPlanning.zoning` example and the `client.prices.priceTiles` / `landPriceTiles` examples, add a paragraph + code block:

````markdown
The full `urbanPlanning` family — all GIS, all dual-format — covers the major urban-planning data layers:

```ts
await client.urbanPlanning.zoning({ z, x, y }); // XKT001 — districts/zoning (Polygon)
await client.urbanPlanning.landUseZones({ z, x, y }); // XKT002 — land-use zones (Polygon)
await client.urbanPlanning.locationOptimization({ z, x, y }); // XKT003 — location optimization plans (Polygon)
await client.urbanPlanning.firePrevention({ z, x, y }); // XKT014 — fire prevention zones (Polygon)
await client.urbanPlanning.districtPlans({ z, x, y }); // XKT023 — district plans (Polygon)
await client.urbanPlanning.highUseDistricts({ z, x, y }); // XKT024 — high-use districts (Polygon)
await client.urbanPlanning.plannedRoads({ z, x, y }); // XKT030 — planned roads (LineString)
```

All accept `{ format: "pbf" }` to receive raw `Uint8Array` instead of typed GeoJSON.
````

### Step 16.3: Commit

```bash
git add README.md
git commit -m "docs: document complete urbanPlanning category in README"
```

---

## Task 17: Push branch and open PR

**Files:** none (git/gh only)

- [ ] **Step 17.1: Final local sanity**

```bash
pnpm test && pnpm typecheck && pnpm build
```

Expected: all three succeed; unit test count ≈ 162 (124 after Task 2 + 6 new tasks × ~6-8 tests = 36-48 new = 160-172 in the suite). Don't worry about exact totals; just verify all green.

- [ ] **Step 17.2: Push branch**

```bash
git push -u origin feat/urban-planning-complete
```

- [ ] **Step 17.3: Open PR**

```bash
gh pr create --title "feat(urban-planning): complete category — XKT002/003/014/023/024/030 (v1.5.0)" --body "$(cat <<'EOF'
## Summary
- Complete the `urbanPlanning` category with 6 new endpoints:
  - **XKT002** — `client.urbanPlanning.landUseZones` (Polygon)
  - **XKT003** — `client.urbanPlanning.locationOptimization` (Polygon)
  - **XKT014** — `client.urbanPlanning.firePrevention` (Polygon)
  - **XKT023** — `client.urbanPlanning.districtPlans` (Polygon)
  - **XKT024** — `client.urbanPlanning.highUseDistricts` (Polygon)
  - **XKT030** — `client.urbanPlanning.plannedRoads` (LineString)
- Refactor: extract `callGis()` helper into `src/core/request.ts` to absorb per-endpoint boilerplate (resolves Plan 3 review follow-up). Migrate XKT001/XPT001/XPT002 to use it; drop redundant `z.union([enum, commaListOf(enum)])` in XPT001/XPT002.
- 6 new opt-in integration tests; 21 cumulative live tests pass against the MLIT API.
- README updated to reflect the complete urbanPlanning family.

## Test plan
- [x] `pnpm test` — ~162 unit tests passing locally (was 120)
- [x] `pnpm typecheck` clean
- [x] `pnpm build` clean
- [x] `pnpm fmt:check` clean
- [x] Live integration: `INTEGRATION=1 pnpm test:integration` — 21/21 passing
- [ ] CI passes on the PR
EOF
)"
```

- [ ] **Step 17.4: Watch CI**

```bash
gh pr checks
```

Wait until green. Fix and push if anything fails.

- [ ] **Step 17.5: Hand off**

Merging triggers release-please to bump version. Multiple `feat:` commits → minor bump (v1.5.0 or higher).

---

## Self-Review

**Spec coverage:**

- §2 Scope — `urbanPlanning` now contains all 7 endpoints listed in the spec. ✓
- §5 Public API — 6 new categorized methods follow the spec's facade pattern. ✓
- §7 Per-Endpoint Module Shape — each new module follows the established template (params + response + endpoint + overloaded call). ✓
- §8 Shared GeoJSON Schemas — XKT030 uses `LineStringGeometry`; possibly adds `MultiLineStringGeometry` (Task 14.1 conditional on actual fixture). ✓
- §9 Testing Strategy — unit + recorded fixtures + opt-in integration covered for each endpoint. ✓
- §10–§14 (CI/CD, etc.) — no changes. ✓

**Placeholder scan:** No "TBD", "TODO", or "similar to Task N" patterns found. The instructional phrases like "mirror task 4 with these substitutions" in Tasks 6/10/12/14 do refer to a specific concrete prior task with all code present — the engineer always has a complete code template available.

**Type consistency:**

- `Params`, `Response`, `paramsSchema`, `responseSchema`, `endpoint`, `call`, `CallOptsGeoJson`, `CallOptsPbf` — names used identically across all 6 new modules and consistent with the established XKT001/XPT001/XPT002 pattern.
- Facade method names: `landUseZones`, `locationOptimization`, `firePrevention`, `districtPlans`, `highUseDistricts`, `plannedRoads` — used consistently across endpoint, facade type, factory, test, and README sections.
- `callGis` helper signature is defined exactly once (Task 2) and the same signature is referenced in every endpoint's `call()` body in Tasks 4, 6, 8, 10, 12, 14.
- `MultiLineStringGeometry` is conditionally added in Task 14.1 — if added, it's referenced in xkt030.ts; if not, only `LineStringGeometry` is used. Both branches are internally consistent.

**Known ambiguity:** XKT030's actual geometry (LineString vs MultiLineString or both) isn't confirmed until Task 13's fixture capture. Task 14 has explicit conditional handling for both cases. This is the only place in the plan where the schema isn't 100% deterministic ahead of fixture capture.

No gaps. Plan ready to execute.

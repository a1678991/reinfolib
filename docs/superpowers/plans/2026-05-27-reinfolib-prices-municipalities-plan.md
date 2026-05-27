# Reinfolib Prices + Municipalities Implementation Plan (v1.3.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the `prices` category (XCT001 + XPT001 + XPT002) and add the `municipalities` category (XIT002). Ship as v1.3.0. No new infrastructure required — every endpoint uses the existing JSON or GIS template established by XIT001 / XKT001 in Plans 1–2.

**Architecture:** Each new endpoint follows the established per-endpoint module shape (`src/endpoints/<category>/<id>.ts` with `paramsSchema`, `responseSchema`, `call`) and is exposed via its category facade (`src/categories/<category>.ts`). One pre-endpoint refactor (Task 2) extracts a `withResponseFormat` helper to remove the paramsSchema duplication flagged by Plan 2's final review (Important #4).

**Tech Stack:** TypeScript 6, zod 4, vitest 4 — unchanged.

**Spec reference:** `docs/superpowers/specs/2026-05-26-reinfolib-typescript-client-design.md` §2 Scope (prices + municipalities categories), §5 Public API, §7 Per-Endpoint Module Shape.
**Predecessor plans:** Plan 1 (`2026-05-26-reinfolib-foundation-plan.md`, v0.1.0–v1.1.0), Plan 2 (`2026-05-27-reinfolib-gis-foundation-plan.md`, v1.2.0).

**Public API additions:**

```ts
client.prices.appraisals({ year, area, division })             // XCT001 — JSON
client.prices.priceTiles({ z, x, y, from, to, ... }, { format? })       // XPT001 — GIS
client.prices.landPriceTiles({ z, x, y, year, ... }, { format? })       // XPT002 — GIS
client.municipalities.list({ area, language? })                // XIT002 — JSON
```

**Out of scope (deferred):**

- Remaining urbanPlanning endpoints (6 XKT) — Plan 4.
- facilities, demographics, disaster categories — Plans 5–6.
- The deferred reviewer follow-ups #5 (optional responseSchema for binary-only paths) and #6 (binary-mode test helper) — opportunistic cleanup in later plans.

---

## File Structure (end of plan)

```
src/
├── categories/
│   ├── prices.ts                       # MODIFIED: + appraisals, priceTiles, landPriceTiles
│   ├── municipalities.ts               # NEW: facade for XIT002
│   └── urban-planning.ts               # unchanged
├── client.ts                           # MODIFIED: + municipalities facade
├── core/
│   ├── common.ts                       # MODIFIED: + responseFormatSchema, withResponseFormat helper
│   └── ...unchanged
└── endpoints/
    ├── prices/
    │   ├── xit001.ts                   # unchanged
    │   ├── xct001.ts                   # NEW (JSON)
    │   ├── xpt001.ts                   # NEW (GIS, uses helper)
    │   └── xpt002.ts                   # NEW (GIS, uses helper)
    ├── municipalities/                 # NEW directory
    │   └── xit002.ts                   # NEW (JSON)
    └── urban-planning/
        └── xkt001.ts                   # MODIFIED: use withResponseFormat helper

tests/
├── fixtures/
│   ├── xit001.json                     # unchanged
│   ├── xkt001.{json,pbf}               # unchanged
│   ├── xct001.json                     # NEW
│   ├── xpt001.{json,pbf}               # NEW
│   ├── xpt002.{json,pbf}               # NEW
│   └── xit002.json                     # NEW
├── integration/
│   ├── xit001.test.ts                  # unchanged
│   ├── xkt001.test.ts                  # unchanged
│   ├── xct001.test.ts                  # NEW
│   ├── xpt001.test.ts                  # NEW
│   ├── xpt002.test.ts                  # NEW
│   └── xit002.test.ts                  # NEW
└── unit/
    ├── core/
    │   └── common.test.ts              # MODIFIED: + withResponseFormat tests
    └── endpoints/
        ├── prices/
        │   ├── xit001.test.ts          # unchanged
        │   ├── xct001.test.ts          # NEW
        │   ├── xpt001.test.ts          # NEW
        │   └── xpt002.test.ts          # NEW
        ├── municipalities/             # NEW directory
        │   └── xit002.test.ts          # NEW
        └── urban-planning/
            └── xkt001.test.ts          # unchanged (helper refactor is internal-only)
```

---

## Task 1: Branch off main + commit plan

**Files:** none (git only)

- [ ] **Step 1.1: Verify clean main**

```bash
git checkout main
git pull --ff-only origin main
git status
```

Expected: clean tree; HEAD includes the v1.2.0 release commit (`chore(release): 1.2.0 [skip ci]` or similar).

- [ ] **Step 1.2: Create feature branch**

```bash
git checkout -b feat/prices-municipalities
```

- [ ] **Step 1.3: Commit this plan doc**

```bash
git add docs/superpowers/plans/2026-05-27-reinfolib-prices-municipalities-plan.md
git commit -m "docs: add prices + municipalities implementation plan"
```

If oxfmt rewrites the markdown when staged, re-add and retry.

---

## Task 2: Extract `withResponseFormat` helper + refactor XKT001

Resolves Plan 2 final review's Important #4. Establishes the cleaner pattern before XPT001/XPT002 inherit the old duplication.

**Files:**

- Modify: `src/core/common.ts`
- Modify: `src/endpoints/urban-planning/xkt001.ts`
- Modify: `tests/unit/core/common.test.ts`

### Step 2.1: Write failing test

Append to `tests/unit/core/common.test.ts`:

```ts
import { responseFormatSchema, withResponseFormat } from "../../../src/core/common.js";

describe("responseFormatSchema", () => {
  it("accepts geojson and pbf", () => {
    expect(responseFormatSchema.safeParse("geojson").success).toBe(true);
    expect(responseFormatSchema.safeParse("pbf").success).toBe(true);
  });
  it("rejects other values", () => {
    expect(responseFormatSchema.safeParse("xml").success).toBe(false);
    expect(responseFormatSchema.safeParse("").success).toBe(false);
  });
});

describe("withResponseFormat", () => {
  const base = z.object({ z: z.number(), x: z.number(), y: z.number() });

  it("extends the schema with response_format", () => {
    const extended = withResponseFormat(base);
    expect(extended.safeParse({ z: 14, x: 1, y: 1, response_format: "geojson" }).success).toBe(
      true,
    );
    expect(extended.safeParse({ z: 14, x: 1, y: 1, response_format: "pbf" }).success).toBe(true);
  });

  it("rejects invalid response_format", () => {
    const extended = withResponseFormat(base);
    expect(extended.safeParse({ z: 14, x: 1, y: 1, response_format: "xml" }).success).toBe(false);
  });

  it("requires response_format (no default)", () => {
    const extended = withResponseFormat(base);
    expect(extended.safeParse({ z: 14, x: 1, y: 1 }).success).toBe(false);
  });
});
```

The `z` import is already present from earlier tests. If not, merge into the existing zod import.

### Step 2.2: Verify failure

```bash
pnpm test tests/unit/core/common.test.ts
```

Expected: 5 new tests fail with `responseFormatSchema`/`withResponseFormat` not exported.

### Step 2.3: Implement the helper

Append to `src/core/common.ts`:

```ts
export const responseFormatSchema = z.enum(["geojson", "pbf"]);

export const withResponseFormat = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({ response_format: responseFormatSchema });
```

### Step 2.4: Refactor `src/endpoints/urban-planning/xkt001.ts` to use the helper

Read the current file to locate the duplicated schema. The current state inside `call()` is:

```ts
return request({
  ...
  paramsSchema: z.object({
    z: zoomSchema,
    x: tileCoordSchema,
    y: tileCoordSchema,
    response_format: z.enum(["geojson", "pbf"]),
  }),
  ...
});
```

Replace with:

```ts
return request({
  ...
  paramsSchema: withResponseFormat(paramsSchema),
  ...
});
```

Add `withResponseFormat` to the existing `import { ... } from "../../core/common.js"` line.

### Step 2.5: Run all tests

```bash
pnpm test
```

Expected: 81 tests pass (76 prior + 5 new). The XKT001 tests still pass — the refactor is behavior-preserving.

### Step 2.6: Typecheck

```bash
pnpm typecheck
```

Expected: silent.

### Step 2.7: Commit

```bash
git add src/core/common.ts src/endpoints/urban-planning/xkt001.ts tests/unit/core/common.test.ts
git commit -m "refactor(common): extract withResponseFormat helper; drop schema duplication in xkt001"
```

---

## Task 3: Capture XCT001 fixture

**Files:**

- Create: `tests/fixtures/xct001.json`

### Step 3.1: Capture from the live API

XCT001 = Real Estate Appraisal Report Information. Required params: `year` (2022–2026), `area` (prefecture code), `division` (00=residential, 03, 05, 07, 09, 10, 13, 20).

Tokyo (`area=13`) with residential division (`division=00`) for fiscal year 2025:

```bash
mkdir -p tests/fixtures
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XCT001?year=2025&area=13&division=00" \
  -o tests/fixtures/xct001.json
```

Verify the response is a non-empty JSON envelope:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xct001.json","utf8")); if(!Array.isArray(j.data)) throw new Error("data missing: "+JSON.stringify(j).slice(0,200)); console.log("records:", j.data.length, "first keys:", Object.keys(j.data[0]||{}).slice(0,15).join(","));'
```

Expected: `records:` followed by a positive integer, then a comma-separated list of property names (e.g. `pricePointInTime,standardLandNumber,...`).

If records count is 0, retry with `area=01` (Hokkaido). If still 0 or an error envelope, **stop and report BLOCKED**.

### Step 3.2: Commit

```bash
git add tests/fixtures/xct001.json
git commit -m "test(fixtures): capture XCT001 appraisal report sample"
```

If oxfmt rewrites the JSON, re-stage and retry.

---

## Task 4: Implement XCT001 endpoint + wire to prices facade

**Files:**

- Create: `src/endpoints/prices/xct001.ts`
- Modify: `src/categories/prices.ts`
- Create: `tests/unit/endpoints/prices/xct001.test.ts`

### Step 4.1: Write failing tests

Create `tests/unit/endpoints/prices/xct001.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xct001.js";

const fixture = JSON.parse(readFileSync(resolve("tests/fixtures/xct001.json"), "utf8"));

describe("XCT001 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ year: "2025", area: "13", division: "00" }).success).toBe(true);
  });

  it("rejects year out of 2022..2026", () => {
    expect(paramsSchema.safeParse({ year: "2021", area: "13", division: "00" }).success).toBe(
      false,
    );
    expect(paramsSchema.safeParse({ year: "2027", area: "13", division: "00" }).success).toBe(
      false,
    );
  });

  it("rejects invalid area", () => {
    expect(paramsSchema.safeParse({ year: "2025", area: "1", division: "00" }).success).toBe(false);
    expect(paramsSchema.safeParse({ year: "2025", area: "ab", division: "00" }).success).toBe(
      false,
    );
  });

  it("accepts only allowed divisions", () => {
    for (const d of ["00", "03", "05", "07", "09", "10", "13", "20"]) {
      expect(paramsSchema.safeParse({ year: "2025", area: "13", division: d }).success).toBe(true);
    }
    expect(paramsSchema.safeParse({ year: "2025", area: "13", division: "01" }).success).toBe(
      false,
    );
  });

  it("accepts comma-separated area codes", () => {
    expect(paramsSchema.safeParse({ year: "2025", area: "13,14", division: "00" }).success).toBe(
      true,
    );
    expect(paramsSchema.safeParse({ year: "2025", area: "13,abc", division: "00" }).success).toBe(
      false,
    );
  });
});

describe("XCT001 response schema", () => {
  it("parses the captured fixture", () => {
    const r = responseSchema.safeParse(fixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XCT001 call()", () => {
  it("returns ok with parsed data", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { year: "2025", area: "13", division: "00" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.status).toBe(fixture.status);
  });

  it("sends correct query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { year: "2025", area: "13", division: "00" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("year=2025");
    expect(url).toContain("area=13");
    expect(url).toContain("division=00");
  });
});

describe("ReinfolibClient.prices.appraisals", () => {
  it("is wired and delegates to XCT001 call()", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.appraisals({ year: "2025", area: "13", division: "00" });
    expect(res.ok).toBe(true);
  });
});
```

Create the directory:

```bash
mkdir -p src/endpoints/prices tests/unit/endpoints/prices
```

(The directories already exist from Plan 1; the `mkdir -p` is idempotent.)

### Step 4.2: Verify failure

```bash
pnpm test tests/unit/endpoints/prices/xct001.test.ts
```

Expected: FAIL — module not found.

### Step 4.3: Implement endpoint module

Create `src/endpoints/prices/xct001.ts`:

```ts
import { z } from "zod";
import { commaListOf, prefCodeSchema } from "../../core/common.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

const yearSchema = z
  .string()
  .regex(/^\d{4}$/)
  .refine((v) => {
    const n = Number(v);
    return n >= 2022 && n <= 2026;
  }, "year must be in 2022..2026");

const divisionSchema = z.enum(["00", "03", "05", "07", "09", "10", "13", "20"]);

export const paramsSchema = z.object({
  year: yearSchema,
  area: commaListOf(prefCodeSchema),
  division: divisionSchema,
});
export type Params = z.infer<typeof paramsSchema>;

const recordSchema = z
  .object({
    pricePointInTime: z.string().optional(),
    standardLandNumber: z.string().optional(),
    municipalityCode: z.string().optional(),
    areaName: z.string().optional(),
    usageClassificationCode: z.string().optional(),
    pricePerSquareMeter: z.string().optional(),
    inheritanceTaxRoadPrice: z.string().optional(),
    location: z.string().optional(),
    landArea: z.string().optional(),
    shape: z.string().optional(),
    nearestTransit: z.string().optional(),
    zoneClassification: z.string().optional(),
    zoneUsageType: z.string().optional(),
    buildingCoverageRatio: z.string().optional(),
    floorAreaRatio: z.string().optional(),
    comparableTransactionPrice: z.string().optional(),
    publicListingPrice: z.string().optional(),
    priceChangeRate: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
  })
  .passthrough();

export const responseSchema = z.object({
  status: z.string(),
  data: z.array(recordSchema),
});
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XCT001", path: "/ex-api/external/XCT001" } as const;

export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptions = {},
): Promise<Result<Response, ReinfolibError>> {
  const retry =
    opts.retry === false ? { ...client.retry, maxAttempts: 1 } : { ...client.retry, ...opts.retry };

  return request({
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
    path: endpoint.path,
    params,
    paramsSchema,
    responseSchema,
    bucket: client.bucket,
    retry,
    timeoutMs: opts.timeoutMs ?? client.timeoutMs,
    ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    fetch: client.fetch,
    ...(client.userAgent !== undefined ? { userAgent: client.userAgent } : {}),
  }) as Promise<Result<Response, ReinfolibError>>;
}
```

The trailing `as` cast is the same narrowing pattern used in `xit001.ts` — `request()` returns `Result<R | Uint8Array, _>`, but JSON callers never get the binary branch.

### Step 4.4: Wire into prices facade

Read `src/categories/prices.ts`. Add an import:

```ts
import * as xct001 from "../endpoints/prices/xct001.js";
```

Extend `PricesFacade`:

```ts
export type PricesFacade = {
  transactionPoints: (params: xit001.Params, opts?: CallOptions) => ReturnType<typeof xit001.call>;
  appraisals: (params: xct001.Params, opts?: CallOptions) => ReturnType<typeof xct001.call>;
};
```

Extend `createPricesFacade`:

```ts
export function createPricesFacade(client: ReinfolibClient): PricesFacade {
  return {
    transactionPoints: (params, opts) => xit001.call(client, params, opts),
    appraisals: (params, opts) => xct001.call(client, params, opts),
  };
}
```

### Step 4.5: Verify pass

```bash
pnpm test
```

Expected: 90 tests pass (81 prior + 9 new).

### Step 4.6: Commit

```bash
git add src/endpoints/prices/xct001.ts src/categories/prices.ts tests/unit/endpoints/prices/xct001.test.ts
git commit -m "feat(prices): add XCT001 appraisal report endpoint"
```

---

## Task 5: Capture XPT001 fixtures (GeoJSON + PBF)

**Files:**

- Create: `tests/fixtures/xpt001.json`
- Create: `tests/fixtures/xpt001.pbf`

### Step 5.1: Identify a productive tile

XPT001 = transaction/contract price points. Required params: `z` (11–15), `x`, `y`, `from` (YYYYN, transactions from 20053), `to` (YYYYN). Tokyo Chuo at z=14: try `x=14552, y=6451` for `from=20241, to=20244`.

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XPT001?response_format=geojson&z=14&x=14552&y=6451&from=20241&to=20244" \
  -o tests/fixtures/xpt001.json
```

Verify:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xpt001.json","utf8")); if(j.type!=="FeatureCollection") throw new Error("not a FeatureCollection: "+JSON.stringify(j).slice(0,200)); console.log("features:", j.features.length, "geom:", j.features[0]?.geometry?.type);'
```

Expected: `features:` > 0; `geom: Point` (XPT001 returns points).

If 0 features, retry with `x=14553, y=6451` or widen range `from=20231&to=20244`. If still empty, **stop and report BLOCKED**.

### Step 5.2: Capture PBF at the same coordinates

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XPT001?response_format=pbf&z=14&x=14552&y=6451&from=20241&to=20244" \
  -o tests/fixtures/xpt001.pbf
```

(Use whichever z/x/y/from/to worked in 5.1.)

Verify it's binary non-empty:

```bash
file tests/fixtures/xpt001.pbf
stat -c '%s' tests/fixtures/xpt001.pbf
```

Expected: `data`-type binary; size > 0.

### Step 5.3: Commit

```bash
git add tests/fixtures/xpt001.json tests/fixtures/xpt001.pbf
git commit -m "test(fixtures): capture XPT001 transaction price tile samples"
```

---

## Task 6: Implement XPT001 endpoint + wire to prices facade

**Files:**

- Create: `src/endpoints/prices/xpt001.ts`
- Modify: `src/categories/prices.ts`
- Create: `tests/unit/endpoints/prices/xpt001.test.ts`

### Step 6.1: Write failing tests

Create `tests/unit/endpoints/prices/xpt001.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xpt001.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xpt001.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xpt001.pbf"));

describe("XPT001 params schema", () => {
  const base = { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" };

  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse(base).success).toBe(true);
  });

  it("rejects zoom outside 11..15", () => {
    expect(paramsSchema.safeParse({ ...base, z: 10 }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, z: 16 }).success).toBe(false);
  });

  it("accepts priceClassification 01/02", () => {
    expect(paramsSchema.safeParse({ ...base, priceClassification: "01" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "02" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "03" }).success).toBe(false);
  });

  it("validates landTypeCode is one of allowed values", () => {
    for (const c of ["01", "02", "07", "10", "11"]) {
      expect(paramsSchema.safeParse({ ...base, landTypeCode: c }).success).toBe(true);
    }
    expect(paramsSchema.safeParse({ ...base, landTypeCode: "99" }).success).toBe(false);
  });

  it("rejects bad from/to format", () => {
    expect(paramsSchema.safeParse({ ...base, from: "2024" }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, from: "20245" }).success).toBe(false);
  });
});

describe("XPT001 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XPT001 call() — GeoJSON", () => {
  it("returns ok with parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("sends response_format=geojson", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
    expect(url).toContain("from=20241");
    expect(url).toContain("to=20244");
  });
});

describe("XPT001 call() — PBF", () => {
  it("returns ok with Uint8Array when format=pbf", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(
      client,
      { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toBeInstanceOf(Uint8Array);
      expect(res.data.byteLength).toBe(pbfFixture.byteLength);
    }
  });
});

describe("ReinfolibClient.prices.priceTiles", () => {
  it("is wired (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.priceTiles({
      z: 14,
      x: 14552,
      y: 6451,
      from: "20241",
      to: "20244",
    });
    expect(res.ok).toBe(true);
  });

  it("is wired (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.priceTiles(
      { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});
```

### Step 6.2: Verify failure

```bash
pnpm test tests/unit/endpoints/prices/xpt001.test.ts
```

Expected: FAIL — module not found.

### Step 6.3: Implement endpoint module

Create `src/endpoints/prices/xpt001.ts`:

```ts
import { z } from "zod";
import { commaListOf, tileCoordSchema, withResponseFormat, zoomSchema } from "../../core/common.js";
import { FeatureCollectionSchema, PointGeometry } from "../../core/geojson.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

const periodSchema = z.string().regex(/^\d{4}[1-4]$/, "must be YYYYN where N is 1..4");
const landTypeCodeSchema = z.enum(["01", "02", "07", "10", "11"]);

export const paramsSchema = z.object({
  z: zoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
  from: periodSchema,
  to: periodSchema,
  priceClassification: z.enum(["01", "02"]).optional(),
  landTypeCode: z.union([landTypeCodeSchema, commaListOf(landTypeCodeSchema)]).optional(),
});
export type Params = z.infer<typeof paramsSchema>;

const propsSchema = z
  .object({
    price_information_category_name_ja: z.string().optional(),
    prefecture_name_ja: z.string().optional(),
    city_name_ja: z.string().optional(),
    district_name_ja: z.string().optional(),
    u_transaction_price_total_ja: z.string().optional(),
    u_unit_price_per_tsubo_ja: z.string().optional(),
    floor_plan_name_ja: z.string().optional(),
    u_area_ja: z.string().optional(),
    u_transaction_price_unit_price_square_meter_ja: z.string().optional(),
    u_construction_year_ja: z.string().optional(),
    building_structure_name_ja: z.string().optional(),
    land_use_name_ja: z.string().optional(),
    point_in_time_name_ja: z.string().optional(),
    land_type_name_ja: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(PointGeometry, propsSchema);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XPT001", path: "/ex-api/external/XPT001" } as const;

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

### Step 6.4: Wire into prices facade

Read `src/categories/prices.ts`. Add an import:

```ts
import * as xpt001 from "../endpoints/prices/xpt001.js";
```

Extend `PricesFacade` with explicit return types per overload (lesson from Plan 2 final review — DO NOT use `ReturnType<typeof xpt001.call>` since it picks only the last overload):

```ts
import type { Result } from "../core/result.js";
import type { ReinfolibError } from "../core/errors.js";

export type PricesFacade = {
  transactionPoints: (params: xit001.Params, opts?: CallOptions) => ReturnType<typeof xit001.call>;
  appraisals: (params: xct001.Params, opts?: CallOptions) => ReturnType<typeof xct001.call>;
  priceTiles: {
    (params: xpt001.Params, opts: xpt001.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (
      params: xpt001.Params,
      opts?: xpt001.CallOptsGeoJson,
    ): Promise<Result<xpt001.Response, ReinfolibError>>;
  };
};
```

Extend `createPricesFacade`:

```ts
export function createPricesFacade(client: ReinfolibClient): PricesFacade {
  return {
    transactionPoints: (params, opts) => xit001.call(client, params, opts),
    appraisals: (params, opts) => xct001.call(client, params, opts),
    priceTiles: ((params, opts) =>
      xpt001.call(client, params, opts as xpt001.CallOptsPbf)) as PricesFacade["priceTiles"],
  };
}
```

(The `as xpt001.CallOptsPbf` inner cast plus outer `as PricesFacade["priceTiles"]` is the established pattern from `urbanPlanning.ts` — keep it consistent across all GIS facade methods.)

### Step 6.5: Verify pass

```bash
pnpm test
```

Expected: 100 tests pass (90 prior + 10 new).

### Step 6.6: Typecheck

```bash
pnpm typecheck
```

Expected: silent.

### Step 6.7: Commit

```bash
git add src/endpoints/prices/xpt001.ts src/categories/prices.ts tests/unit/endpoints/prices/xpt001.test.ts
git commit -m "feat(prices): add XPT001 transaction price tile endpoint"
```

---

## Task 7: Capture XPT002 fixtures (GeoJSON + PBF)

**Files:**

- Create: `tests/fixtures/xpt002.json`
- Create: `tests/fixtures/xpt002.pbf`

### Step 7.1: Capture GeoJSON

XPT002 = land price publication + survey points. Required: `z` (13–15, NOT 11), `x`, `y`, `year` (1995–2024). Optional: `priceClassification` (0=public assessment only, 1=prefectural survey only), `useCategoryCode`.

Tokyo Chuo at z=14, year=2024:

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XPT002?response_format=geojson&z=14&x=14552&y=6451&year=2024" \
  -o tests/fixtures/xpt002.json
```

Verify:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xpt002.json","utf8")); if(j.type!=="FeatureCollection") throw new Error("not a FeatureCollection: "+JSON.stringify(j).slice(0,200)); console.log("features:", j.features.length, "geom:", j.features[0]?.geometry?.type);'
```

Expected: features > 0; geom = Point.

If 0 features, retry with `x=14624, y=6016` (the example from the docs) or different year. If still empty, **stop and report BLOCKED**.

### Step 7.2: Capture PBF

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XPT002?response_format=pbf&z=14&x=14552&y=6451&year=2024" \
  -o tests/fixtures/xpt002.pbf
```

(Use same coords as 7.1.)

```bash
file tests/fixtures/xpt002.pbf
stat -c '%s' tests/fixtures/xpt002.pbf
```

Expected: binary non-empty.

### Step 7.3: Commit

```bash
git add tests/fixtures/xpt002.json tests/fixtures/xpt002.pbf
git commit -m "test(fixtures): capture XPT002 land price tile samples"
```

---

## Task 8: Implement XPT002 endpoint + wire to prices facade

**Files:**

- Create: `src/endpoints/prices/xpt002.ts`
- Modify: `src/categories/prices.ts`
- Create: `tests/unit/endpoints/prices/xpt002.test.ts`

### Step 8.1: Write failing tests

Create `tests/unit/endpoints/prices/xpt002.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xpt002.js";

const geoFixture = JSON.parse(readFileSync(resolve("tests/fixtures/xpt002.json"), "utf8"));
const pbfFixture = readFileSync(resolve("tests/fixtures/xpt002.pbf"));

describe("XPT002 params schema", () => {
  const base = { z: 14, x: 14552, y: 6451, year: "2024" };

  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse(base).success).toBe(true);
  });

  it("rejects zoom outside 13..15", () => {
    expect(paramsSchema.safeParse({ ...base, z: 12 }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, z: 16 }).success).toBe(false);
  });

  it("accepts priceClassification 0 / 1", () => {
    expect(paramsSchema.safeParse({ ...base, priceClassification: "0" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "1" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, priceClassification: "2" }).success).toBe(false);
  });

  it("validates useCategoryCode values", () => {
    expect(paramsSchema.safeParse({ ...base, useCategoryCode: "00" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, useCategoryCode: "00,03,05" }).success).toBe(true);
    expect(paramsSchema.safeParse({ ...base, useCategoryCode: "99" }).success).toBe(false);
  });

  it("rejects year outside 1995..2024", () => {
    expect(paramsSchema.safeParse({ ...base, year: "1994" }).success).toBe(false);
    expect(paramsSchema.safeParse({ ...base, year: "2025" }).success).toBe(false);
  });
});

describe("XPT002 response schema", () => {
  it("parses the captured GeoJSON fixture", () => {
    const r = responseSchema.safeParse(geoFixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XPT002 call() — GeoJSON", () => {
  it("returns ok with parsed FeatureCollection", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451, year: "2024" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.type).toBe("FeatureCollection");
  });

  it("sends correct query params", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { z: 14, x: 14552, y: 6451, year: "2024" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("response_format=geojson");
    expect(url).toContain("year=2024");
  });
});

describe("XPT002 call() — PBF", () => {
  it("returns ok with Uint8Array", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { z: 14, x: 14552, y: 6451, year: "2024" }, { format: "pbf" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toBeInstanceOf(Uint8Array);
      expect(res.data.byteLength).toBe(pbfFixture.byteLength);
    }
  });
});

describe("ReinfolibClient.prices.landPriceTiles", () => {
  it("is wired (GeoJSON)", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(geoFixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.landPriceTiles({ z: 14, x: 14552, y: 6451, year: "2024" });
    expect(res.ok).toBe(true);
  });

  it("is wired (PBF)", async () => {
    const fetchFn = vi.fn(async () => new Response(pbfFixture, { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.landPriceTiles(
      { z: 14, x: 14552, y: 6451, year: "2024" },
      { format: "pbf" },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeInstanceOf(Uint8Array);
  });
});
```

### Step 8.2: Verify failure

```bash
pnpm test tests/unit/endpoints/prices/xpt002.test.ts
```

Expected: FAIL — module not found.

### Step 8.3: Implement endpoint module

Create `src/endpoints/prices/xpt002.ts`:

```ts
import { z } from "zod";
import { commaListOf, tileCoordSchema, withResponseFormat } from "../../core/common.js";
import { FeatureCollectionSchema, PointGeometry } from "../../core/geojson.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

const xpt002ZoomSchema = z.number().int().min(13).max(15);
const yearStringSchema = z
  .string()
  .regex(/^\d{4}$/)
  .refine((v) => {
    const n = Number(v);
    return n >= 1995 && n <= 2024;
  }, "year must be in 1995..2024");
const useCategoryCodeSchema = z.enum(["00", "03", "05", "07", "09", "10", "13", "20"]);

export const paramsSchema = z.object({
  z: xpt002ZoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
  year: yearStringSchema,
  priceClassification: z.enum(["0", "1"]).optional(),
  useCategoryCode: z.union([useCategoryCodeSchema, commaListOf(useCategoryCodeSchema)]).optional(),
});
export type Params = z.infer<typeof paramsSchema>;

const propsSchema = z
  .object({
    point_id: z.string().optional(),
    target_year_name_ja: z.string().optional(),
    land_price_type: z.string().optional(),
    prefecture_code: z.string().optional(),
    prefecture_name_ja: z.string().optional(),
    city_code: z.string().optional(),
    use_category_name_ja: z.string().optional(),
    standard_lot_number_ja: z.string().optional(),
    u_current_years_price_ja: z.string().optional(),
    front_road_width: z.string().optional(),
    gas_supply_availability: z.string().optional(),
    nearest_station_name_ja: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(PointGeometry, propsSchema);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XPT002", path: "/ex-api/external/XPT002" } as const;

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

### Step 8.4: Wire into prices facade

Edit `src/categories/prices.ts`. Add:

```ts
import * as xpt002 from "../endpoints/prices/xpt002.js";
```

Extend `PricesFacade`:

```ts
export type PricesFacade = {
  transactionPoints: (...): ReturnType<typeof xit001.call>;       // unchanged
  appraisals: (...): ReturnType<typeof xct001.call>;              // unchanged
  priceTiles: { ... };                                            // unchanged
  landPriceTiles: {
    (params: xpt002.Params, opts: xpt002.CallOptsPbf): Promise<Result<Uint8Array, ReinfolibError>>;
    (params: xpt002.Params, opts?: xpt002.CallOptsGeoJson): Promise<Result<xpt002.Response, ReinfolibError>>;
  };
};
```

Extend `createPricesFacade`:

```ts
export function createPricesFacade(client: ReinfolibClient): PricesFacade {
  return {
    transactionPoints: (params, opts) => xit001.call(client, params, opts),
    appraisals: (params, opts) => xct001.call(client, params, opts),
    priceTiles: ((params, opts) =>
      xpt001.call(client, params, opts as xpt001.CallOptsPbf)) as PricesFacade["priceTiles"],
    landPriceTiles: ((params, opts) =>
      xpt002.call(client, params, opts as xpt002.CallOptsPbf)) as PricesFacade["landPriceTiles"],
  };
}
```

### Step 8.5: Verify pass

```bash
pnpm test
```

Expected: 110 tests pass (100 prior + 10 new).

### Step 8.6: Commit

```bash
git add src/endpoints/prices/xpt002.ts src/categories/prices.ts tests/unit/endpoints/prices/xpt002.test.ts
git commit -m "feat(prices): add XPT002 land price tile endpoint"
```

---

## Task 9: Capture XIT002 fixture

**Files:**

- Create: `tests/fixtures/xit002.json`

### Step 9.1: Capture from live API

XIT002 = municipality list for a prefecture. Required: `area` (prefecture code). Optional: `language` (ja|en).

Tokyo (`area=13`) in English:

```bash
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT002?area=13&language=en" \
  -o tests/fixtures/xit002.json
```

Verify (XIT002 may return either an array directly or a `{ status, data: [...] }` envelope — check the actual structure):

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync("tests/fixtures/xit002.json","utf8")); const arr=Array.isArray(j)?j:j.data; if(!Array.isArray(arr)) throw new Error("no array: "+JSON.stringify(j).slice(0,200)); console.log("records:", arr.length, "first:", JSON.stringify(arr[0]));'
```

Expected: `records: 23` (Tokyo has 23 special wards + cities); first record like `{"id":"13101","name":"Chiyoda Ward"}`.

If 0 records or error envelope, **stop and report BLOCKED**.

**Document the envelope shape** (bare array vs `{status, data}`) — you'll need that for the schema in Task 10. The MLIT docs show a bare array example.

### Step 9.2: Commit

```bash
git add tests/fixtures/xit002.json
git commit -m "test(fixtures): capture XIT002 municipality list sample"
```

---

## Task 10: Implement XIT002 endpoint + create municipalities facade + wire to client

**Files:**

- Create: `src/endpoints/municipalities/xit002.ts`
- Create: `src/categories/municipalities.ts`
- Modify: `src/client.ts`
- Create: `tests/unit/endpoints/municipalities/xit002.test.ts`

### Step 10.1: Write failing tests

The fixture envelope shape determines the responseSchema. The tests assume the bare-array shape (per the MLIT docs example):

```json
[ { "id": "13101", "name": "Chiyoda Ward" }, ... ]
```

If your fixture shows `{ status: ..., data: [...] }` instead, adapt the schema in Step 10.3 accordingly (use `z.object({ status: z.string(), data: z.array(...) })`) and update the test assertions on `res.data` (e.g. `res.data.data[0].id` instead of `res.data[0].id`).

Create `tests/unit/endpoints/municipalities/xit002.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import {
  paramsSchema,
  responseSchema,
  call,
} from "../../../../src/endpoints/municipalities/xit002.js";

const fixture = JSON.parse(readFileSync(resolve("tests/fixtures/xit002.json"), "utf8"));

describe("XIT002 params schema", () => {
  it("accepts a valid request", () => {
    expect(paramsSchema.safeParse({ area: "13" }).success).toBe(true);
    expect(paramsSchema.safeParse({ area: "13", language: "en" }).success).toBe(true);
    expect(paramsSchema.safeParse({ area: "13", language: "ja" }).success).toBe(true);
  });

  it("rejects invalid area", () => {
    expect(paramsSchema.safeParse({ area: "1" }).success).toBe(false);
    expect(paramsSchema.safeParse({ area: "abc" }).success).toBe(false);
  });

  it("rejects invalid language", () => {
    expect(paramsSchema.safeParse({ area: "13", language: "fr" }).success).toBe(false);
  });
});

describe("XIT002 response schema", () => {
  it("parses the captured fixture", () => {
    const r = responseSchema.safeParse(fixture);
    expect(r.success, JSON.stringify(r.success ? null : r.error.issues.slice(0, 3))).toBe(true);
  });
});

describe("XIT002 call()", () => {
  it("returns ok with parsed data", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { area: "13" });
    expect(res.ok).toBe(true);
  });

  it("sends correct query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { area: "13", language: "en" });
    const url = String((fetchFn.mock.calls[0] as unknown as [string, RequestInit?])[0]);
    expect(url).toContain("area=13");
    expect(url).toContain("language=en");
  });
});

describe("ReinfolibClient.municipalities.list", () => {
  it("is wired and delegates to XIT002 call()", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.municipalities.list({ area: "13" });
    expect(res.ok).toBe(true);
  });
});
```

### Step 10.2: Verify failure

```bash
mkdir -p src/endpoints/municipalities tests/unit/endpoints/municipalities
pnpm test tests/unit/endpoints/municipalities/xit002.test.ts
```

Expected: FAIL — module not found.

### Step 10.3: Implement endpoint module

Create `src/endpoints/municipalities/xit002.ts`. The body assumes a **bare-array response** per the MLIT docs; if your Task 9 fixture has `{ status, data: [...] }`, replace the `responseSchema` definition accordingly.

```ts
import { z } from "zod";
import { languageSchema, prefCodeSchema } from "../../core/common.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

export const paramsSchema = z.object({
  area: prefCodeSchema,
  language: languageSchema.optional(),
});
export type Params = z.infer<typeof paramsSchema>;

const recordSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .passthrough();

// Bare array per the MLIT docs example. If your fixture shows a `{status, data}` envelope,
// swap to: `z.object({ status: z.string(), data: z.array(recordSchema) })`
export const responseSchema = z.array(recordSchema);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XIT002", path: "/ex-api/external/XIT002" } as const;

export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptions = {},
): Promise<Result<Response, ReinfolibError>> {
  const retry =
    opts.retry === false ? { ...client.retry, maxAttempts: 1 } : { ...client.retry, ...opts.retry };

  return request({
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
    path: endpoint.path,
    params,
    paramsSchema,
    responseSchema,
    bucket: client.bucket,
    retry,
    timeoutMs: opts.timeoutMs ?? client.timeoutMs,
    ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    fetch: client.fetch,
    ...(client.userAgent !== undefined ? { userAgent: client.userAgent } : {}),
  }) as Promise<Result<Response, ReinfolibError>>;
}
```

### Step 10.4: Create the municipalities facade

Create `src/categories/municipalities.ts`:

```ts
import * as xit002 from "../endpoints/municipalities/xit002.js";
import type { ReinfolibClient, CallOptions } from "../client.js";

export type MunicipalitiesFacade = {
  list: (params: xit002.Params, opts?: CallOptions) => ReturnType<typeof xit002.call>;
};

export function createMunicipalitiesFacade(client: ReinfolibClient): MunicipalitiesFacade {
  return {
    list: (params, opts) => xit002.call(client, params, opts),
  };
}
```

### Step 10.5: Wire into the client

Edit `src/client.ts`. Add the import alongside `createPricesFacade` and `createUrbanPlanningFacade`:

```ts
import {
  createMunicipalitiesFacade,
  type MunicipalitiesFacade,
} from "./categories/municipalities.js";
```

Add the field declaration alongside `prices` and `urbanPlanning`:

```ts
  readonly municipalities: MunicipalitiesFacade;
```

Add the constructor assignment right after `this.urbanPlanning = createUrbanPlanningFacade(this);`:

```ts
this.municipalities = createMunicipalitiesFacade(this);
```

### Step 10.6: Update `tests/unit/client.test.ts` to assert the new facade

Append a new test inside the existing `describe("ReinfolibClient")` block:

```ts
it("exposes the municipalities category facade", () => {
  const c = new ReinfolibClient({ apiKey: "k" });
  expect(c.municipalities).toBeDefined();
});
```

### Step 10.7: Verify pass

```bash
pnpm test
```

Expected: 117 tests pass (110 prior + 7 new). If your fixture had `{status, data}` envelope and you adapted the schema, the test count and call-test data extraction differ but should still net positive.

### Step 10.8: Typecheck

```bash
pnpm typecheck
```

Expected: silent.

### Step 10.9: Commit

```bash
git add src/endpoints/municipalities/ src/categories/municipalities.ts src/client.ts tests/unit/endpoints/municipalities/ tests/unit/client.test.ts
git commit -m "feat(municipalities): add XIT002 endpoint + municipalities category"
```

---

## Task 11: Add opt-in integration tests for all four new endpoints

**Files:**

- Create: `tests/integration/xct001.test.ts`
- Create: `tests/integration/xpt001.test.ts`
- Create: `tests/integration/xpt002.test.ts`
- Create: `tests/integration/xit002.test.ts`

### Step 11.1: Create `tests/integration/xct001.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XCT001 — live", () => {
  runIt(
    "hits the real endpoint and parses the response",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.prices.appraisals({ year: "2025", area: "13", division: "00" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBeDefined();
        expect(Array.isArray(res.data.data)).toBe(true);
      }
    },
    30_000,
  );
});
```

### Step 11.2: Create `tests/integration/xpt001.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XPT001 — live", () => {
  runIt(
    "GeoJSON: hits the real endpoint and parses",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.prices.priceTiles({
        z: 14,
        x: 14552,
        y: 6451,
        from: "20241",
        to: "20244",
      });
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
      const res = await client.prices.priceTiles(
        { z: 14, x: 14552, y: 6451, from: "20241", to: "20244" },
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

### Step 11.3: Create `tests/integration/xpt002.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XPT002 — live", () => {
  runIt(
    "GeoJSON: hits the real endpoint and parses",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.prices.landPriceTiles({
        z: 14,
        x: 14552,
        y: 6451,
        year: "2024",
      });
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
      const res = await client.prices.landPriceTiles(
        { z: 14, x: 14552, y: 6451, year: "2024" },
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

### Step 11.4: Create `tests/integration/xit002.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env["REINFOLIB_API_KEY"];
const runIt = process.env["INTEGRATION"] === "1" && apiKey ? it : it.skip;

describe("XIT002 — live", () => {
  runIt(
    "hits the real endpoint and parses the municipality list",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.municipalities.list({ area: "13", language: "en" });
      expect(res.ok).toBe(true);
      if (res.ok) {
        // Adapt the next two lines based on whether the response is a bare array or `{status, data}`.
        const arr = Array.isArray(res.data) ? res.data : (res.data as { data: unknown[] }).data;
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBeGreaterThan(0);
      }
    },
    30_000,
  );
});
```

### Step 11.5: Verify all skip without env

```bash
pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 8 skipped (1 XIT001 + 2 XKT001 + 1 XCT001 + 2 XPT001 + 2 XPT002 + 1 XIT002 = 9 actually; double-check by counting).

Actually: 1 (XIT001) + 2 (XKT001) + 1 (XCT001) + 2 (XPT001) + 2 (XPT002) + 1 (XIT002) = **9 skipped**.

### Step 11.6: Verify all pass with env

```bash
INTEGRATION=1 REINFOLIB_API_KEY=YOUR_API_KEY \
  pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 9 passed.

If any fail (network, empty response, schema mismatch), capture the output and report BLOCKED.

### Step 11.7: Commit

```bash
git add tests/integration/xct001.test.ts tests/integration/xpt001.test.ts tests/integration/xpt002.test.ts tests/integration/xit002.test.ts
git commit -m "test: add opt-in integration tests for XCT001/XPT001/XPT002/XIT002"
```

---

## Task 12: Update README

**Files:**

- Modify: `README.md`

### Step 12.1: Update the version line

Find the existing line near the top:

```
> **v1.2.0** ships XIT001 (prices) and XKT001 (urban-planning zoning) — the GIS architecture is now live. Remaining 29 endpoints land in v1.3.0+.
```

Replace with:

```
> **v1.3.0** completes the `prices` category (XIT001, XCT001, XPT001, XPT002) and adds the `municipalities` category (XIT002). Remaining 25 endpoints land in v1.4.0+.
```

### Step 12.2: Extend the Quickstart with a second JSON example

Find the Quickstart's `client.prices.transactionPoints(...)` snippet. After that example (and the `for (const record of res.data.data)` loop), add a new short example:

````markdown
### Municipality list

```ts
const munis = await client.municipalities.list({ area: "13", language: "en" });
if (munis.ok) {
  for (const m of munis.data /* or munis.data.data — depends on envelope */) {
    console.log(m.id, m.name);
  }
}
```
````

(Phrasing on the envelope branch is intentional — adjust to your fixture's actual shape after Task 9.)

### Step 12.3: Extend the GIS section

Find the "## GIS endpoints (GeoJSON + PBF)" section. After the `client.urbanPlanning.zoning(...)` examples, add a sentence and example:

````markdown
The same dual-format pattern applies to `client.prices.priceTiles(...)` (transaction price points) and `client.prices.landPriceTiles(...)` (published land price points):

```ts
const priceTiles = await client.prices.priceTiles({
  z: 14,
  x: 14552,
  y: 6451,
  from: "20241",
  to: "20244",
});

const landPrices = await client.prices.landPriceTiles({
  z: 14,
  x: 14552,
  y: 6451,
  year: "2024",
});
```
````

### Step 12.4: Commit

```bash
git add README.md
git commit -m "docs: cover XCT001/XPT001/XPT002/XIT002 in README"
```

---

## Task 13: Push branch and open PR

**Files:** none (git/gh only)

- [ ] **Step 13.1: Final local sanity**

```bash
pnpm test && pnpm typecheck && pnpm build
```

Expected: all three succeed; test count ≈ 117.

- [ ] **Step 13.2: Push the branch**

```bash
git push -u origin feat/prices-municipalities
```

- [ ] **Step 13.3: Open the PR**

```bash
gh pr create --title "feat(prices,municipalities): complete prices category + add municipalities (v1.3.0)" --body "$(cat <<'EOF'
## Summary
- Complete the `prices` category by adding:
  - **XCT001** — `client.prices.appraisals({year, area, division})` — JSON appraisal report data.
  - **XPT001** — `client.prices.priceTiles({z, x, y, from, to, ...}, {format?})` — GIS transaction/contract price points.
  - **XPT002** — `client.prices.landPriceTiles({z, x, y, year, ...}, {format?})` — GIS published land price + survey points.
- Add the `municipalities` category and its first endpoint:
  - **XIT002** — `client.municipalities.list({area, language?})` — municipality code/name list per prefecture.
- Refactor: extract `withResponseFormat` helper into `src/core/common.ts`; drop the per-endpoint paramsSchema duplication flagged by the v1.2.0 final review.
- Add opt-in integration tests for all four new endpoints.
- README updated with new examples.

## Test plan
- [x] `pnpm test` — ~117 unit tests passing locally (was 76)
- [x] `pnpm typecheck` clean
- [x] `pnpm build` clean
- [x] `pnpm fmt:check` clean
- [x] Live integration: `INTEGRATION=1 pnpm test:integration` — 9 tests pass (XIT001 + XKT001×2 + new: XCT001 + XPT001×2 + XPT002×2 + XIT002)
- [ ] CI passes on the PR
EOF
)"
```

- [ ] **Step 13.4: Watch CI**

```bash
gh pr checks
```

Wait for both `CI` and `Lint Actions` workflows to be green. If a check fails, fix and push.

- [ ] **Step 13.5: Hand off**

Once CI is green, the PR is ready for human review/merge. Merging triggers Release, which publishes **v1.3.0** (multiple `feat:` commits → minor bump).

---

## Self-Review

**Spec coverage:**

- §2 Scope — `prices` category was XIT001-only after Plan 2; this plan adds XCT001/XPT001/XPT002 to complete it. `municipalities` category is newly created with XIT002. ✓
- §5 Public API — `client.prices.appraisals`, `priceTiles`, `landPriceTiles`, `client.municipalities.list` added. Existing `client.prices.transactionPoints` and `client.urbanPlanning.zoning` unchanged. ✓
- §6 Core Request Pipeline — no changes; reused intact. ✓
- §7 Per-Endpoint Module Shape — every new endpoint follows the existing template (XIT001 for JSON, XKT001 for GIS). ✓
- §8 Shared GeoJSON Schemas — XPT001/XPT002 use `FeatureCollectionSchema(PointGeometry, ...)`. ✓
- §9 Testing Strategy — fixtures, unit, opt-in integration all covered. ✓
- §10–§14 (CI/CD, commit lint, Renovate, build, deferred items) — no changes needed. ✓

**Placeholder scan:** Searched for "TBD", "TODO", "implement later", "similar to Task N", "fill in details", and empty fix descriptions. None found. Every code step has full code; every command has expected output.

**Type consistency:**

- `Params`, `Response`, `paramsSchema`, `responseSchema`, `endpoint`, `call`, `CallOptsGeoJson`, `CallOptsPbf` — names match across the new XCT001/XPT001/XPT002/XIT002 modules and the existing XIT001/XKT001.
- Facade method names: `appraisals` (XCT001), `priceTiles` (XPT001), `landPriceTiles` (XPT002), `list` (XIT002) — used consistently across endpoint, facade, test, integration, and README sections.
- `withResponseFormat` helper used identically in XPT001 + XPT002 (and refactored into XKT001 via Task 2).
- All GIS facade overload entries use explicit `Promise<Result<X, ReinfolibError>>` return types per Plan 2's final review — no `ReturnType<typeof X.call>` shortcut on the overloaded variants. ✓

**One known acceptable ambiguity:** XIT002's response envelope (bare array vs `{status, data}`) is unconfirmed pre-implementation. Task 9 captures the fixture and Task 10/11 explicitly call out which line(s) to adapt if the envelope shape differs. The default schema in Task 10 matches the MLIT docs example (bare array).

No gaps. Plan ready to execute.

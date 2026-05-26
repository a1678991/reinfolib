# Reinfolib TypeScript Client — Design

**Date:** 2026-05-26
**Package:** `@a1678991/reinfolib`
**Repository:** `github.com/a1678991/reinfolib`
**Target:** Node.js 24+, ESM only

## 1. Purpose

A typed TypeScript client for the MLIT 不動産情報ライブラリ (Real Estate Information Library) API. Covers all 31 publicly documented endpoints. Every request payload and response is described with zod v4 schemas, so callers get inferred types and runtime validation from a single declaration. Errors are returned via a `Result<T, E>` discriminated union rather than thrown.

Reference: https://www.reinfolib.mlit.go.jp/help/apiManual/

## 2. Scope

### In scope (v1)

All 31 endpoints, grouped into 6 categories:

| Category         | Endpoints                                                                              |
| ---------------- | -------------------------------------------------------------------------------------- |
| `prices`         | XIT001, XCT001, XPT001, XPT002                                                         |
| `municipalities` | XIT002                                                                                 |
| `urbanPlanning`  | XKT001, XKT002, XKT003, XKT014, XKT023, XKT024, XKT030                                 |
| `facilities`     | XKT004, XKT005, XKT006, XKT007, XKT010, XKT011, XKT017, XKT018, XKT019                 |
| `demographics`   | XKT013, XKT015, XKT031                                                                 |
| `disaster`       | XKT016, XKT020, XKT021, XKT022, XKT025, XKT026, XKT027, XKT028, XKT029, XGT001, XST001 |

Both output formats are supported:

- `format=geojson` (default where available) — parsed FeatureCollection, zod-validated.
- `format=pbf` — raw `Uint8Array`, passed through unmodified. No PBF decoder dependency.

### Out of scope (v1)

- PBF-to-GeoJSON decoding (callers feed PBF bytes to `@mapbox/vector-tile` themselves).
- Browser/Deno/Bun runtimes (Node 24+ only).
- CommonJS output (ESM only).
- Persisted/disk caching (in-memory rate limiting only).
- A CLI binary.

## 3. Toolchain

| Concern                   | Tool                                  | Version                           |
| ------------------------- | ------------------------------------- | --------------------------------- |
| Language                  | TypeScript                            | `^6.0.3`                          |
| Runtime types             | zod                                   | `^4.4.3`                          |
| Package manager           | pnpm                                  | (repo standard)                   |
| Linter                    | oxlint                                | `^1.67.0`                         |
| Formatter                 | oxfmt                                 | `~0.52.0` (pinned tight; pre-1.0) |
| Test runner               | vitest                                | `^4.1.7`                          |
| Release                   | semantic-release                      | `^25.0.3`                         |
| └ commit-analyzer         |                                       | `^13.0.1`                         |
| └ release-notes-generator |                                       | `^14.1.1`                         |
| └ changelog               |                                       | `^6.0.3`                          |
| └ npm                     |                                       | `^13.1.5`                         |
| └ github                  |                                       | `^12.0.8`                         |
| └ git                     |                                       | `^10.0.1`                         |
| Commit lint               | @commitlint/cli + config-conventional | `^21.0.1`                         |
| Git hooks                 | lefthook                              | `^2.1.8`                          |
| Dependency updates        | Renovate                              | (GitHub App)                      |
| Registry                  | GitHub Packages                       | `https://npm.pkg.github.com/`     |

All versions verified against the npm registry on 2026-05-26.

Rationale notes:

- **TypeScript 6** is GA (npm `latest`). Native ESM emit, no CJS shim required.
- **oxfmt is pre-1.0**; output format may shift between minor versions. Pin to `~0.52.0` to avoid CI churn; bump deliberately.
- **lefthook** chosen over husky: single Go binary, faster, declarative YAML config, no node-side scripts in `.husky/`.

## 4. Repository Layout

```
reinfolib/
├── src/
│   ├── index.ts                       # public entry; re-exports client, types, errors, Result
│   ├── client.ts                      # ReinfolibClient class; category facades
│   ├── core/
│   │   ├── request.ts                 # unified pipeline (validate → rate-limit → retry → fetch → parse)
│   │   ├── rate-limit.ts              # token bucket
│   │   ├── retry.ts                   # exponential backoff with full jitter
│   │   ├── errors.ts                  # ReinfolibError discriminated union
│   │   ├── result.ts                  # Result<T,E> + ok()/err()
│   │   ├── geojson.ts                 # shared GeoJSON FeatureCollection zod schemas
│   │   └── common.ts                  # shared param schemas (prefCode, cityCode, year, ztile, ...)
│   └── endpoints/
│       ├── prices/                    # XIT001, XCT001, XPT001, XPT002
│       ├── municipalities/            # XIT002
│       ├── urban-planning/            # XKT001-003, 014, 023-024, 030
│       ├── facilities/                # XKT004-007, 010-011, 017-019
│       ├── demographics/              # XKT013, 015, 031
│       └── disaster/                  # XKT016, 020-022, 025-029, XGT001, XST001
├── tests/
│   ├── unit/                          # mirrors src/endpoints layout
│   ├── integration/                   # opt-in; hits live API
│   └── fixtures/                      # captured JSON + PBF samples
├── scripts/
│   └── capture-fixture.ts             # one-shot fixture capture using REINFOLIB_API_KEY
├── docs/
│   └── superpowers/specs/             # this file
├── .github/workflows/
│   ├── ci.yml                         # lint + fmt:check + typecheck + test + commitlint on PR
│   └── release.yml                    # semantic-release on push to main
├── .oxlintrc.json
├── lefthook.yaml
├── commitlint.config.mjs
├── release.config.mjs
├── renovate.json
├── vitest.config.ts
├── tsconfig.json                      # editor/typecheck (noEmit)
├── tsconfig.build.json                # emit dist/
├── package.json
├── .npmrc                             # @a1678991:registry=https://npm.pkg.github.com/
├── README.md
└── LICENSE
```

## 5. Public API

```ts
import { ReinfolibClient } from "@a1678991/reinfolib";

const client = new ReinfolibClient({
  apiKey: process.env.REINFOLIB_API_KEY!,
  // all of the below are optional with sensible defaults
  baseUrl: "https://www.reinfolib.mlit.go.jp",
  timeoutMs: 30_000,
  userAgent: "@a1678991/reinfolib/<version>",
  rateLimit: { capacity: 10, refillPerSecond: 5 },
  retry: {
    maxAttempts: 4,
    baseDelayMs: 500,
    maxDelayMs: 30_000,
    jitter: "full",
    retryOn: [408, 425, 429, 500, 502, 503, 504],
  },
  fetch: globalThis.fetch, // override for tests
});

// GeoJSON
const res = await client.prices.transactionPoints({
  year: 2024,
  quarter: 3,
  prefCode: "13",
  z: 13,
  x: 7314,
  y: 3225,
});
if (!res.ok) {
  // res.error: ReinfolibError discriminated union
  return;
}
res.data; // FeatureCollection<Point, ZTransactionProps> — inferred from zod

// PBF passthrough
const tile = await client.urbanPlanning.zoning({ z: 13, x: 7314, y: 3225 }, { format: "pbf" });
if (tile.ok) tile.data; // Uint8Array

// Per-request overrides
const ac = new AbortController();
await client.disaster.floods(
  { z: 13, x: 7314, y: 3225 },
  {
    signal: ac.signal,
    timeoutMs: 5_000,
    retry: { maxAttempts: 1 }, // disable retry for this call
  },
);
```

Category accessors on the client: `prices`, `municipalities`, `urbanPlanning`, `facilities`, `demographics`, `disaster`. Each is a thin object whose methods delegate to the corresponding per-endpoint module.

## 6. Core Request Pipeline

Single function used by every endpoint, in `src/core/request.ts`:

```ts
type RequestArgs<P, R> = {
  client: ReinfolibClient;
  endpoint: { id: string; path: string };
  params: P;
  paramsSchema: z.ZodType<P>;
  responseSchema: z.ZodType<R>;
  opts?: {
    format?: "geojson" | "pbf";
    signal?: AbortSignal;
    timeoutMs?: number;
    retry?: Partial<RetryConfig> | false;
    rateLimit?: false;
  };
};

async function request<P, R>(a: RequestArgs<P, R>): Promise<Result<R | Uint8Array, ReinfolibError>>;
```

Pipeline order:

1. **Validate params** — `paramsSchema.safeParse(params)`. Failure → `err({ kind: "validation", phase: "params", issues })`. Never retried.
2. **Rate-limit gate** — `acquire(1)` on the client's shared token bucket (unless `rateLimit: false`). FIFO queue; waits on `setTimeout` or rejects on caller's `AbortSignal`.
3. **Retry loop** — up to `retry.maxAttempts`, with exponential backoff between attempts. Each retry re-acquires a rate-limit token.
4. **Fetch** — `GET ${baseUrl}${path}?${query}` with header `Ocp-Apim-Subscription-Key: ${apiKey}`. Combine caller's `signal` with an internal timeout `AbortController`.
5. **Branch on format**:
   - `pbf` → read body as `ArrayBuffer`, return `new Uint8Array(buf)`.
   - `geojson` (or omitted) → `await res.json()`, then `responseSchema.safeParse`.
6. **Result wrap** — success: `ok(data)`. Failure: discriminated `err`.

### Token Bucket (`core/rate-limit.ts`)

- Configurable `capacity` (max burst) and `refillPerSecond`.
- In-memory, attached to the client instance (one bucket per client).
- `acquire(n=1, signal?)` resolves when `n` tokens are available. Lazy refill on each acquire: `tokens += elapsedMs / 1000 * refillPerSecond`, clamped to `capacity`.
- Pending acquires form a FIFO queue; on refill, head of queue is woken first. Prevents starvation.
- `signal` causes immediate rejection with `{ kind: "aborted" }`.
- Setting `rateLimit: false` at construction skips the bucket entirely.

### Retry with Backoff (`core/retry.ts`)

- Retry triggers (any of):
  - Network error (fetch threw).
  - Timeout (internal `AbortController` fired).
  - HTTP status in `retry.retryOn` (default: 408, 425, 429, 500, 502, 503, 504).
- Validation errors (zod, both phases) are never retried.
- Caller `AbortSignal` aborting is never retried (returns `{ kind: "aborted" }`).
- Delay: `min(maxDelayMs, baseDelayMs * 2^(attempt-1))`.
- With `jitter: "full"` (default), actual sleep is `random(0, computedDelay)` — AWS-recommended full-jitter scheme, best at preventing thundering herd among multiple clients.
- **`Retry-After` honored** on 429/503 responses: if header present and parseable (seconds or HTTP-date), use that value instead of computed backoff. Still capped at `maxDelayMs`.
- Per-request `retry: false` or `retry: { maxAttempts: 1 }` disables retries for that call.

### Error Union (`core/errors.ts`)

```ts
export type ReinfolibError =
  | { kind: "validation"; phase: "params" | "response"; issues: z.ZodIssue[] }
  | { kind: "api"; status: number; body: unknown; attempts: number }
  | { kind: "network"; cause: unknown; attempts: number }
  | { kind: "timeout"; timeoutMs: number; attempts: number }
  | { kind: "aborted"; cause: unknown };
```

`attempts` reflects total attempts made (including the failing one) — useful for telemetry and tests.

## 7. Per-Endpoint Module Shape

Each file in `src/endpoints/<category>/<id>.ts` follows the same template:

```ts
import { z } from "zod";
import { FeatureCollectionSchema, PointGeometry } from "../../core/geojson.js";
import { request } from "../../core/request.js";
import type { ReinfolibClient } from "../../client.js";
import type { CallOptions, Result } from "../../core/result.js";

export const paramsSchema = z.object({
  year: z.number().int().min(2005).max(2025),
  quarter: z.number().int().min(1).max(4),
  prefCode: z.string().regex(/^\d{2}$/),
  z: z.number().int(),
  x: z.number().int(),
  y: z.number().int(),
});
export type Params = z.infer<typeof paramsSchema>;

export const propsSchema = z.object({
  // ...endpoint-specific feature properties
});
export const responseSchema = FeatureCollectionSchema(PointGeometry, propsSchema);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XIT001", path: "/ex-api/external/XIT001" } as const;

export function call(
  client: ReinfolibClient,
  params: Params,
  opts?: CallOptions,
): Promise<Result<Response | Uint8Array, ReinfolibError>> {
  return request({ client, endpoint, params, paramsSchema, responseSchema, opts });
}
```

`client.ts` imports each module and wires it into a category object:

```ts
import * as transactionPoints from "./endpoints/prices/xit001.js";
// ...

class ReinfolibClient {
  readonly prices = {
    transactionPoints: (p, o?) => transactionPoints.call(this, p, o),
    appraisalReports: (p, o?) => appraisalReports.call(this, p, o),
    // ...
  };
  // ...
}
```

No per-endpoint logic lives in `client.ts` — only wiring.

## 8. Shared GeoJSON Schemas (`core/geojson.ts`)

Generic `FeatureCollectionSchema<G, P>(geometry, props)` produces:

```ts
z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: geometry, // PointGeometry | PolygonGeometry | ...
      properties: props,
    }),
  ),
});
```

Plus prebuilt geometry schemas: `PointGeometry`, `LineStringGeometry`, `PolygonGeometry`, `MultiPolygonGeometry`. Endpoint modules just compose these with their own `propsSchema`.

## 9. Testing Strategy

| Layer       | Tool                    | When it runs                                         |
| ----------- | ----------------------- | ---------------------------------------------------- |
| Unit        | vitest + mocked `fetch` | every PR / CI                                        |
| Integration | vitest + live API       | opt-in (`INTEGRATION=1`) and nightly cron (optional) |
| Fixtures    | committed JSON + PBF    | source of truth for unit tests                       |

### Unit tests

Each endpoint module has a sibling `*.test.ts`:

1. **Params schema** rejects bad input (boundary cases per field).
2. **Response schema** parses the recorded fixture cleanly.
3. **Error mapping** — 4xx → `api` error; malformed body → `validation` (phase: response); fetch throws → `network`.
4. **Format branching** — `format: "pbf"` returns `Uint8Array`; default returns parsed object.

Core tests cover the pipeline mechanics:

- Token bucket: burst drains, refill rate, FIFO ordering, abort.
- Retry: exponential delays, jitter range, `retryOn` filter, `Retry-After` honored, validation errors never retry, max attempts respected, `attempts` counter accurate.

### Fixtures

`tests/fixtures/<endpoint-id>.json` (and `.pbf` for binary). A one-shot capture script (`scripts/capture-fixture.ts`) reads `REINFOLIB_API_KEY` from env, hits the live API with a small representative param set per endpoint, writes the response. Run manually; output is committed.

### Integration tests

Live calls behind `INTEGRATION=1 pnpm test`. They only assert response **shape** (zod parse succeeds) — never specific data values, since the live data changes.

## 10. CI/CD

### `ci.yml` (PR + push)

Jobs (parallel where possible):

1. `lint` — `pnpm oxlint`
2. `format` — `pnpm oxfmt --check`
3. `typecheck` — `pnpm tsc --noEmit`
4. `test` — `pnpm vitest run` (unit only)
5. `commitlint` — `pnpm commitlint --from=origin/main --to=HEAD` (PRs only)

### `release.yml` (push to main)

```
checkout (full history + tags)
  → setup-node + pnpm install
  → typecheck + test
  → pnpm build
  → semantic-release   # reads commits, bumps version, publishes
```

Required secrets: `GITHUB_TOKEN` (auto-provided), `NPM_TOKEN` set to a GitHub PAT with `write:packages`.

### `release.config.mjs`

Plugin order matches the sister `website` project convention: changelog → npm → github → git (git last, so the release commit includes the updated CHANGELOG and package.json after the npm publish + GitHub release succeed).

```js
/** @type {import('semantic-release').GlobalConfig} */
export default {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
    ["@semantic-release/npm", { npmPublish: true }],
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json", "pnpm-lock.yaml"],
        message: "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
  ],
  tagFormat: "v${version}",
};
```

### `.npmrc` (committed)

```
@a1678991:registry=https://npm.pkg.github.com/
```

## 11. Commit Lint + Git Hooks

### `commitlint.config.mjs`

```js
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0], // matches the sister `website` project: don't fight sentence case
  },
};
```

### `lefthook.yaml`

Uses the newer `jobs:` syntax (lefthook ≥1.7) which the sister `website` project standardizes on. Also includes a `pre-push` guard preventing direct pushes to `main` — semantic-release is triggered by merges, so all work belongs on feature branches.

```yaml
commit-msg:
  parallel: true
  jobs:
    - name: commitlint
      run: pnpm run commitlint --edit {1}

pre-commit:
  parallel: true
  jobs:
    - name: lint
      glob: "*.{ts,js,mjs,cjs}"
      run: pnpm oxlint {staged_files}
    - name: fmt
      glob: "*.{ts,js,mjs,cjs,json,md,yml,yaml}"
      run: pnpm oxfmt --check {staged_files}
    - name: typecheck
      run: pnpm typecheck

pre-push:
  parallel: true
  jobs:
    - name: check-branch
      run: |
        branch=$(git rev-parse --abbrev-ref HEAD)
        if [ "$branch" = "main" ]; then
          echo "❌ Direct push to main branch is not allowed!"
          echo "Please create a feature branch and open a pull request."
          exit 1
        fi
```

`pnpm install` runs `prepare: lefthook install`, which wires the hooks into `.git/hooks/`. Contributors who skip hooks are still caught by the CI `commitlint` step.

## 12. Renovate — Automated Dependency Updates

Renovate (GitHub App, free for OSS) opens PRs for dep updates. Config mirrors the sister `website` project for consistency.

### `renovate.json`

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:best-practices",
    ":semanticCommits",
    ":enableVulnerabilityAlertsWithLabel(security)"
  ],
  "timezone": "Asia/Tokyo",
  "schedule": ["before 9am on saturday"],
  "osvVulnerabilityAlerts": true
}
```

What this gives us:

- **`config:best-practices`** — Renovate's recommended preset: includes `:dependencyDashboard`, semantic-prefixed commits compatible with our commitlint config, sane grouping for related deps (e.g. all `@semantic-release/*` together, all `@commitlint/*` together), and `prHourlyLimit`/`prConcurrentLimit` to keep the PR queue manageable.
- **`:semanticCommits`** — every Renovate PR uses conventional-commit subjects (`chore(deps): ...`, `fix(deps): ...`). Required because main is gated by commitlint.
- **Vulnerability alerts** — `osvVulnerabilityAlerts: true` + the `security` label preset open immediate PRs for advisories, bypassing the weekly schedule.
- **Schedule** — non-security updates batch into a single Saturday 09:00 JST window, so PR noise lands at one predictable time per week.

Renovate PRs flow through the same CI as human PRs (lint, fmt:check, typecheck, test, commitlint). semantic-release then picks up `fix(deps): ...` commits as patch releases and `feat(deps): ...` as minor — matching how the website project ships dependency updates.

### Enabling

1. Install the Renovate GitHub App on the `a1678991/reinfolib` repo via https://github.com/apps/renovate.
2. First-run "Configure Renovate" onboarding PR is auto-opened by the bot; the committed `renovate.json` is detected and the PR closes without changes.
3. No further config required.

## 13. `package.json` (excerpt)

```json
{
  "name": "@a1678991/reinfolib",
  "version": "0.0.0-development",
  "description": "TypeScript client for the MLIT 不動産情報ライブラリ (Real Estate Information Library) API",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "engines": { "node": ">=24" },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": { "registry": "https://npm.pkg.github.com/" },
  "repository": { "type": "git", "url": "https://github.com/a1678991/reinfolib.git" },
  "scripts": {
    "prepare": "lefthook install",
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "fmt": "oxfmt",
    "fmt:check": "oxfmt --check",
    "test": "vitest run",
    "test:watch": "vitest",
    "commitlint": "commitlint --edit",
    "release": "semantic-release"
  },
  "dependencies": { "zod": "^4.4.3" },
  "devDependencies": {
    "typescript": "^6.0.3",
    "oxlint": "^1.67.0",
    "oxfmt": "~0.52.0",
    "vitest": "^4.1.7",
    "@commitlint/cli": "^21.0.1",
    "@commitlint/config-conventional": "^21.0.1",
    "lefthook": "^2.1.8",
    "semantic-release": "^25.0.3",
    "@semantic-release/commit-analyzer": "^13.0.1",
    "@semantic-release/release-notes-generator": "^14.1.1",
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/npm": "^13.1.5",
    "@semantic-release/github": "^12.0.8",
    "@semantic-release/git": "^10.0.1"
  }
}
```

## 14. Build & Module Output

- `tsconfig.json` for editor/typecheck — `noEmit: true`, `module: "nodenext"`, `moduleResolution: "nodenext"`, `target: "es2024"`, `strict: true`, `verbatimModuleSyntax: true`.
- `tsconfig.build.json` extends it with `noEmit: false`, `outDir: "dist"`, declaration + source maps on.
- ESM only. Every relative import in `src/` ends with `.js` (Node ESM requirement).
- No bundler — `tsc` is the build.

## 15. Open Questions / Deferred

- Whether to add an opt-in nightly integration workflow on day one or defer until v0.2.
- Whether to publish a small `@a1678991/reinfolib-pbf` companion package later that decodes PBF responses into GeoJSON.
- Param-schema accuracy will need verification per endpoint against each detail page (XIT001/.../XST001) — pre-implementation research task in the plan.

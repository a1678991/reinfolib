# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@a1678991/reinfolib` — TypeScript client for the MLIT 不動産情報ライブラリ (Real Estate Information Library) API. Published privately to GitHub Packages. Node 24+, ESM only.

## Commands

Tool versions are pinned in `mise.toml` (node 24, pnpm 11, lefthook, actionlint, zizmor, pinact). Run `mise install` once; mise's `postinstall` hook then wires lefthook into `.git/hooks/`.

- `pnpm test` — vitest, unit only (excludes `tests/integration/**`)
- `pnpm test path/to/file.test.ts` — single file
- `pnpm test -t "describe substring"` — filter by name
- `pnpm test:integration` — opt-in live API tests; requires `INTEGRATION=1 REINFOLIB_API_KEY=<key>` (set in environment, not committed)
- `pnpm typecheck` — `tsc --noEmit`; **does NOT require a prior build** (tsconfig.json `paths` maps `@a1678991/reinfolib` → `./src/index.js` so examples typecheck against source)
- `pnpm build` — emits `dist/` via `tsconfig.build.json`. **Required before any `pnpm example:*` runtime** because the examples import the package by name (`@a1678991/reinfolib`), which resolves at runtime via `exports` to `dist/index.js`
- `pnpm lint` / `pnpm fmt` — oxlint / oxfmt (replaces biome; no `.prettierrc`)
- `pnpm release` — semantic-release; runs only in CI, never locally
- `mise run actions:lint` — actionlint + zizmor over `.github/workflows`

## Architecture

The client follows a three-layer shape that scales mechanically to the remaining ~25 endpoints across spec'd categories (`urbanPlanning`, `facilities`, `demographics`, `disaster`).

**Layer 1 — `src/core/`**

One pipeline (`request.ts`) used by every endpoint. The pipeline is: `paramsSchema.safeParse` → token-bucket gate (`rate-limit.ts`) → retry loop (`retry.ts`, exponential backoff with full jitter, honors `Retry-After`) → fetch with timeout → branch on `responseKind`: `"json"` runs `responseSchema.safeParse`; `"binary"` returns `Uint8Array` and skips zod. All errors funnel into the `ReinfolibError` discriminated union (`errors.ts`) and the function returns `Result<T, E>` (`result.ts`) — **the public API never throws**. `geojson.ts` provides shared `FeatureCollectionSchema<G, P>(geometry, props)` + 4 geometry primitives. `common.ts` has shared param schemas (prefCode, year, quarter, language, ztile coords, plus the `withResponseFormat` helper that extends a Zod object with `response_format: enum(["geojson","pbf"])` — use it for every GIS endpoint).

**Layer 2 — `src/endpoints/<category>/<id>.ts`**

One file per MLIT endpoint, all the same shape: export `paramsSchema`, `responseSchema`, `endpoint = { id, path }`, and `call(client, params, opts?)`. JSON endpoints have a single `call`; GIS endpoints have **function overloads** on `opts.format` — `"pbf"` returns `Result<Uint8Array, _>`, default returns `Result<FeatureCollection, _>`. The terminating `return request({...})` typically needs an `as Promise<Result<Response, _>>` cast since `request()` returns the wider `R | Uint8Array` union; JSON endpoints document why this cast is safe (they never set `responseKind: "binary"`).

**Layer 3 — `src/categories/<category>.ts`**

Each category exports a `createXFacade(client)` function that wires its endpoints onto methods named for ergonomics (not endpoint IDs). `client.ts` constructs the facades in its constructor. **Critical gotcha:** GIS facade entries MUST use explicit `Promise<Result<X, ReinfolibError>>` per overload — `ReturnType<typeof xkt001.call>` silently collapses to the last overload (caught + fixed during v1.2.0 review; details in `docs/superpowers/specs/...`).

## Branch & release flow

- `pre-push` hook (in `lefthook.yaml`) blocks direct pushes to `main`. Always work on a feature branch.
- Every commit on `main` triggers `release.yml` → semantic-release → publishes to GitHub Packages and tags `vX.Y.Z` per conventional-commit history. The release commit `chore(release): X.Y.Z [skip ci]` is auto-pushed back to main.
- Conventional commits are enforced by `commitlint.config.mjs` (commit-msg hook + CI). `feat:` triggers minor bump, `fix:` patch, `BREAKING CHANGE:` major.
- All actions in `.github/workflows/` are pinned to commit SHAs by **pinact**; run `mise run actions:pinact` after editing workflows.

## Strict mode

`tsconfig.json` has `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax` all on. The `exactOptionalPropertyTypes` constraint means you can't assign `T | undefined` directly to an optional field — use conditional spread:

```ts
...(opts.signal !== undefined ? { signal: opts.signal } : {})
```

This pattern is established across every endpoint module.

## Testing patterns

- Fixtures in `tests/fixtures/<id>.{json,pbf}` are captured from the live API (Tokyo Chuo, `area=13` or `city=13102`, tile `x=14552 y=6451 z=14` for most GIS) and committed. Each endpoint has a "parses the captured fixture" test that exercises the response schema against real data.
- **The MLIT docs sometimes lie.** Confirmed deviations:
  - XCT001 returns Japanese-keyed records (`価格時点`, etc.) despite English-named docs → use `z.object({}).passthrough()` for opaque records.
  - XIT002 returns `{ status, data: [...] }` envelope despite the docs example showing a bare array.
  - XPT002's `sewer_supply_availability` is a boolean, not a string.
  - **Always capture a fixture and verify the actual shape before writing schemas.**
- Tests cast `fetchFn.mock.calls[0]` through `unknown` first because `vi.fn()` defaults to empty-tuple call type. Established pattern; don't fight it.

## Pre-commit hooks (lefthook)

Active on every commit:

1. `commit-msg`: `pnpm commitlint --edit {1}`
2. `pre-commit`: `pnpm oxlint {staged_files}`, `pnpm oxfmt --check {staged_files}`, `pnpm typecheck`, `pnpm exec secretlint --no-glob {staged_files}`
3. `pre-commit` (when workflow files staged): `mise run actions:lint`

Active on every push: 4. `pre-push`: blocks direct push to `main`; runs `mise run secrets:scan-history` (gitleaks over full git history).

**NEVER use `--no-verify`**. If oxfmt rewrites files while staging, `git add` the formatted version and retry the commit.

## Secret scanning (two layers, different scopes)

Reason for two tools: secretlint has curated provider rules (AWS/GitHub/Slack/OpenAI/…) but **no entropy detection and no Azure-API-Mgmt rule** — meaning it would not have caught the previously-leaked MLIT subscription key. Gitleaks adds entropy-based generic detection (verified to catch 32-hex tokens behind `Ocp-Apim-Subscription-Key:` or `REINFOLIB_API_KEY=` via its `generic-api-key` rule).

| Tool                                                            | Stage                                       | Scope               | Why                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **secretlint** (`@secretlint/secretlint-rule-preset-recommend`) | pre-commit (lefthook), CI working-tree scan | staged files / tree | Fast feedback at commit-time for ~28 well-known provider tokens                                                            |
| **gitleaks** (mise-managed binary)                              | pre-push (lefthook), CI history scan        | full git history    | Entropy + ~150 rules catches unknown-provider secrets (Azure-API-Mgmt shape, the MLIT class) before code leaves the laptop |

Configs: `.secretlintrc.json`, `.secretlintignore`, `.gitleaks.toml` (extends default ruleset; allowlists `tests/fixtures/`). Manual invocation: `mise run secrets:scan-tree`, `mise run secrets:scan-history`, or `mise run secrets:scan` for both.

## Planning docs

Implementation plans live in `docs/superpowers/plans/` (one per minor release, e.g. `2026-05-27-reinfolib-prices-municipalities-plan.md`). The original architectural spec is at `docs/superpowers/specs/2026-05-26-reinfolib-typescript-client-design.md` — read this when you need to know intended method names or category groupings for the unimplemented endpoints.

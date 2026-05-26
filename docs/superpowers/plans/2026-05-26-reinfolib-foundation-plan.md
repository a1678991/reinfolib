# Reinfolib TypeScript Client — Foundation Plan (v0.1.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@a1678991/reinfolib@0.1.0` to GitHub Packages: a working TypeScript client with full project scaffolding (CI, release, lint/fmt, hooks, Renovate) and **one reference endpoint (XIT001)** that proves the architecture end-to-end.

**Architecture:** Per-endpoint modules export zod schemas + a `call(client, params)` function. A shared `core/request.ts` runs the pipeline: validate params → rate-limit gate → retry loop → fetch → validate response → return `Result<T, E>`. JSON endpoints only in this plan; GIS/GeoJSON/PBF support arrives in Plan 2.

**Tech Stack:** TypeScript 6, zod 4, vitest 4, oxlint, oxfmt, lefthook, commitlint, semantic-release 25, Renovate. Node 24+, ESM only. pnpm.

**Spec reference:** `docs/superpowers/specs/2026-05-26-reinfolib-typescript-client-design.md`

**Out of scope (deferred to Plan 2):**

- GIS endpoints (all XKT*, XCT*, XPT*, XGT*, XST\*)
- `core/geojson.ts` (FeatureCollection schemas)
- PBF format branching in the request pipeline
- The other 30 endpoints

---

## File Structure (end of plan)

```
reinfolib/
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── .gitignore
├── .npmrc
├── .oxlintrc.json
├── LICENSE
├── README.md
├── commitlint.config.mjs
├── lefthook.yaml
├── package.json
├── pnpm-lock.yaml
├── release.config.mjs
├── renovate.json
├── src/
│   ├── client.ts                 # ReinfolibClient class + category facades
│   ├── index.ts                  # public re-exports
│   ├── core/
│   │   ├── common.ts             # shared param zod schemas (prefCode, year, quarter, ...)
│   │   ├── errors.ts             # ReinfolibError discriminated union
│   │   ├── rate-limit.ts         # TokenBucket
│   │   ├── request.ts            # unified pipeline
│   │   ├── result.ts             # Result<T,E> + ok/err
│   │   └── retry.ts              # exponential backoff with full jitter
│   └── endpoints/
│       └── prices/
│           └── xit001.ts         # reference endpoint
├── tests/
│   ├── fixtures/
│   │   └── xit001.json           # captured response
│   ├── integration/
│   │   └── xit001.test.ts        # opt-in live API test
│   └── unit/
│       ├── client.test.ts
│       ├── core/
│       │   ├── rate-limit.test.ts
│       │   ├── request.test.ts
│       │   ├── result.test.ts
│       │   └── retry.test.ts
│       └── endpoints/
│           └── prices/
│               └── xit001.test.ts
├── tsconfig.build.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Task 1: Initialize repository

**Files:**

- Create: `package.json`, `.gitignore`, `LICENSE`, `tsconfig.json`, `tsconfig.build.json`, `README.md` (stub)

- [ ] **Step 1.1: Initialize git**

Run (from `/home/a1678991/IdeaProjects/tools/reinfolib`):

```bash
git init
git branch -M main
```

Expected: `Initialized empty Git repository in .../.git/`

- [ ] **Step 1.2: Create `.gitignore`**

Write `.gitignore`:

```
node_modules
dist
coverage
*.log
.DS_Store
.env
.env.local
.husky-disabled
```

- [ ] **Step 1.3: Create `LICENSE` (MIT)**

Write `LICENSE`:

```
MIT License

Copyright (c) 2026 a1678991

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 1.4: Create `package.json`**

Write `package.json`:

```json
{
  "name": "@a1678991/reinfolib",
  "version": "0.0.0-development",
  "description": "TypeScript client for the MLIT 不動産情報ライブラリ (Real Estate Information Library) API",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": {
    "node": ">=24"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "publishConfig": {
    "registry": "https://npm.pkg.github.com/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/a1678991/reinfolib.git"
  },
  "homepage": "https://github.com/a1678991/reinfolib#readme",
  "bugs": {
    "url": "https://github.com/a1678991/reinfolib/issues"
  },
  "keywords": ["mlit", "reinfolib", "real-estate", "japan", "api-client", "typescript", "zod"],
  "license": "MIT",
  "author": "a1678991",
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
    "test:integration": "INTEGRATION=1 vitest run tests/integration",
    "commitlint": "commitlint --edit",
    "release": "semantic-release"
  }
}
```

- [ ] **Step 1.5: Create `tsconfig.json`** (editor/typecheck — `noEmit`)

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2024",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["es2024"],
    "strict": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": false,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*", "tests/**/*", "*.config.mjs", "*.config.ts"]
}
```

- [ ] **Step 1.6: Create `tsconfig.build.json`** (emits to `dist/`)

Write `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["tests", "**/*.test.ts"]
}
```

- [ ] **Step 1.7: Create stub `README.md`**

Write `README.md`:

```markdown
# @a1678991/reinfolib

TypeScript client for the MLIT 不動産情報ライブラリ (Real Estate Information Library) API.

Status: under construction. Real docs land with v0.1.0.
```

- [ ] **Step 1.8: Commit**

```bash
git add .
git commit -m "chore: scaffold package metadata and tsconfig"
```

---

## Task 2: Install dependencies

**Files:**

- Modify: `package.json` (deps populated by pnpm)
- Create: `pnpm-lock.yaml`

- [ ] **Step 2.1: Install runtime + dev deps**

Run:

```bash
pnpm add zod@^4.4.3
pnpm add -D typescript@^6.0.3 oxlint@^1.67.0 oxfmt@~0.52.0 vitest@^4.1.7 \
  @commitlint/cli@^21.0.1 @commitlint/config-conventional@^21.0.1 \
  lefthook@^2.1.8 \
  semantic-release@^25.0.3 @semantic-release/commit-analyzer@^13.0.1 \
  @semantic-release/release-notes-generator@^14.1.1 @semantic-release/changelog@^6.0.3 \
  @semantic-release/npm@^13.1.5 @semantic-release/github@^12.0.8 \
  @semantic-release/git@^10.0.1
```

Expected: pnpm completes; `pnpm-lock.yaml` is created.

- [ ] **Step 2.2: Verify typescript runs**

Run:

```bash
pnpm exec tsc --version
```

Expected output: `Version 6.0.3` (or matching `^6.0.3`).

- [ ] **Step 2.3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install dependencies"
```

---

## Task 3: Configure oxlint

**Files:**

- Create: `.oxlintrc.json`

- [ ] **Step 3.1: Write `.oxlintrc.json`**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "perf": "warn"
  },
  "rules": {
    "no-console": "warn"
  },
  "ignorePatterns": ["dist", "coverage", "node_modules"]
}
```

- [ ] **Step 3.2: Verify oxlint runs (no files yet — should succeed)**

Run:

```bash
pnpm lint
```

Expected: oxlint reports 0 errors (no source yet).

- [ ] **Step 3.3: Commit**

```bash
git add .oxlintrc.json
git commit -m "chore: configure oxlint"
```

---

## Task 4: Configure oxfmt

oxfmt uses sensible defaults; no config file required.

- [ ] **Step 4.1: Verify oxfmt runs**

Run:

```bash
pnpm fmt:check
```

Expected: oxfmt exits 0 (nothing to check yet) OR reports its current behavior. Either way, the command must not error.

- [ ] **Step 4.2: Commit (no-op if nothing changed)**

Only commit if something needs committing.

---

## Task 5: Configure vitest

**Files:**

- Create: `vitest.config.ts`

- [ ] **Step 5.1: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/integration/**", "node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
    },
  },
});
```

- [ ] **Step 5.2: Add a smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("vitest works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5.3: Run tests**

Run:

```bash
pnpm test
```

Expected: 1 test passes.

- [ ] **Step 5.4: Commit**

```bash
git add vitest.config.ts tests/unit/smoke.test.ts
git commit -m "chore: configure vitest"
```

---

## Task 6: Configure commitlint

**Files:**

- Create: `commitlint.config.mjs`

- [ ] **Step 6.1: Write `commitlint.config.mjs`**

```js
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0],
  },
};
```

- [ ] **Step 6.2: Verify commitlint accepts a valid message**

Run:

```bash
echo "feat: add commitlint config" | pnpm exec commitlint
```

Expected: exit 0, no output.

- [ ] **Step 6.3: Verify commitlint rejects invalid**

Run:

```bash
echo "bad message" | pnpm exec commitlint
```

Expected: non-zero exit; output mentions `subject-empty` or `type-empty`.

- [ ] **Step 6.4: Commit**

```bash
git add commitlint.config.mjs
git commit -m "chore: configure commitlint"
```

---

## Task 7: Configure lefthook

**Files:**

- Create: `lefthook.yaml`

- [ ] **Step 7.1: Write `lefthook.yaml`**

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

- [ ] **Step 7.2: Install hooks**

Run:

```bash
pnpm exec lefthook install
```

Expected: `sync hooks: ✔️ (commit-msg, pre-commit, pre-push)`.

- [ ] **Step 7.3: Verify commit-msg hook rejects bad message**

Run (must fail before commit is made):

```bash
git commit --allow-empty -m "bad message" || echo "hook blocked as expected"
```

Expected: commit aborted; "hook blocked as expected" printed.

- [ ] **Step 7.4: Commit lefthook config**

```bash
git add lefthook.yaml
git commit -m "chore: configure lefthook git hooks"
```

---

## Task 8: Configure semantic-release

**Files:**

- Create: `release.config.mjs`

- [ ] **Step 8.1: Write `release.config.mjs`**

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

- [ ] **Step 8.2: Dry-run validation (skip — needs GITHUB_TOKEN; verified via CI in Task 11)**

- [ ] **Step 8.3: Commit**

```bash
git add release.config.mjs
git commit -m "chore: configure semantic-release"
```

---

## Task 9: Configure Renovate

**Files:**

- Create: `renovate.json`

- [ ] **Step 9.1: Write `renovate.json`**

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

- [ ] **Step 9.2: Commit**

```bash
git add renovate.json
git commit -m "chore: enable Renovate"
```

Note: Renovate is enabled on the repo once the GitHub App is installed at https://github.com/apps/renovate. No code action needed.

---

## Task 10: GitHub Packages publish config

**Files:**

- Create: `.npmrc`

- [ ] **Step 10.1: Write `.npmrc`**

```
@a1678991:registry=https://npm.pkg.github.com/
```

- [ ] **Step 10.2: Commit**

```bash
git add .npmrc
git commit -m "chore: set @a1678991 scope to GitHub Packages registry"
```

---

## Task 11: CI workflow

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 11.1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # commitlint needs full history

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm fmt:check

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Commitlint (PR only)
        if: github.event_name == 'pull_request'
        run: pnpm exec commitlint --from=${{ github.event.pull_request.base.sha }} --to=${{ github.event.pull_request.head.sha }}
```

- [ ] **Step 11.2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint/fmt/typecheck/test/commitlint workflow"
```

---

## Task 12: Release workflow

**Files:**

- Create: `.github/workflows/release.yml`

- [ ] **Step 12.1: Write `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write
  packages: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
          registry-url: https://npm.pkg.github.com/
          scope: "@a1678991"

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

      - run: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 12.2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add semantic-release publish workflow"
```

---

## Task 13: Implement `Result<T, E>`

**Files:**

- Create: `src/core/result.ts`
- Test: `tests/unit/core/result.test.ts`

- [ ] **Step 13.1: Write failing test**

Create `tests/unit/core/result.test.ts`:

```ts
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
```

- [ ] **Step 13.2: Verify it fails**

Run:

```bash
pnpm test tests/unit/core/result.test.ts
```

Expected: FAIL — `Cannot find module '../../../src/core/result.js'`.

- [ ] **Step 13.3: Implement**

Create `src/core/result.ts`:

```ts
export type Ok<T> = { readonly ok: true; readonly data: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
```

- [ ] **Step 13.4: Verify it passes**

Run:

```bash
pnpm test tests/unit/core/result.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 13.5: Commit**

```bash
git add src/core/result.ts tests/unit/core/result.test.ts
git commit -m "feat: add Result<T,E> discriminated union"
```

---

## Task 14: Implement `ReinfolibError`

**Files:**

- Create: `src/core/errors.ts`
- Test: `tests/unit/core/result.test.ts` (extend, no new file)

- [ ] **Step 14.1: Implement directly (pure type definitions — no behavior to test beyond discrimination, which TS itself enforces)**

Create `src/core/errors.ts`:

```ts
import type { ZodIssue } from "zod";

export type ReinfolibError =
  | { kind: "validation"; phase: "params" | "response"; issues: ZodIssue[] }
  | { kind: "api"; status: number; body: unknown; attempts: number }
  | { kind: "network"; cause: unknown; attempts: number }
  | { kind: "timeout"; timeoutMs: number; attempts: number }
  | { kind: "aborted"; cause: unknown };
```

- [ ] **Step 14.2: Add a discrimination test**

Append to `tests/unit/core/result.test.ts`:

```ts
import type { ReinfolibError } from "../../../src/core/errors.js";
import { describe as describe2, it as it2, expect as expect2 } from "vitest";

describe2("ReinfolibError", () => {
  it2("discriminates by kind", () => {
    const e: ReinfolibError = { kind: "timeout", timeoutMs: 1000, attempts: 2 };
    if (e.kind === "timeout") {
      const ms: number = e.timeoutMs;
      const a: number = e.attempts;
      expect2(ms).toBe(1000);
      expect2(a).toBe(2);
    }
  });
});
```

- [ ] **Step 14.3: Run tests**

Run:

```bash
pnpm test tests/unit/core/result.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 14.4: Commit**

```bash
git add src/core/errors.ts tests/unit/core/result.test.ts
git commit -m "feat: add ReinfolibError discriminated union"
```

---

## Task 15: Implement Token Bucket

**Files:**

- Create: `src/core/rate-limit.ts`
- Test: `tests/unit/core/rate-limit.test.ts`

- [ ] **Step 15.1: Write failing tests**

Create `tests/unit/core/rate-limit.test.ts`:

```ts
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
```

- [ ] **Step 15.2: Verify they fail**

Run:

```bash
pnpm test tests/unit/core/rate-limit.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 15.3: Implement**

Create `src/core/rate-limit.ts`:

```ts
export type TokenBucketConfig = {
  capacity: number;
  refillPerSecond: number;
};

type Waiter = {
  resolve: () => void;
  reject: (cause: unknown) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
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
    if (signal?.aborted) return Promise.reject(signal.reason);

    this.#refill();
    if (this.#queue.length === 0 && this.#tokens >= 1) {
      this.#tokens -= 1;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { resolve, reject, signal };
      if (signal) {
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
    if (this.#timer || this.#queue.length === 0) return;
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
      if (w.signal && w.abortListener) {
        w.signal.removeEventListener("abort", w.abortListener);
      }
      this.#tokens -= 1;
      w.resolve();
    }
  }
}
```

- [ ] **Step 15.4: Verify tests pass**

Run:

```bash
pnpm test tests/unit/core/rate-limit.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 15.5: Commit**

```bash
git add src/core/rate-limit.ts tests/unit/core/rate-limit.test.ts
git commit -m "feat: add token bucket rate limiter"
```

---

## Task 16: Implement retry with exponential backoff

**Files:**

- Create: `src/core/retry.ts`
- Test: `tests/unit/core/retry.test.ts`

- [ ] **Step 16.1: Write failing tests**

Create `tests/unit/core/retry.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
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
    // rand=0 → 0, rand=1 → computed
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
```

- [ ] **Step 16.2: Verify they fail**

Run:

```bash
pnpm test tests/unit/core/retry.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 16.3: Implement**

Create `src/core/retry.ts`:

```ts
export type Jitter = "none" | "full";

export type RetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: Jitter;
  retryOn: number[];
};

export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: "full",
  retryOn: [408, 425, 429, 500, 502, 503, 504],
};

export function parseRetryAfter(header: string | undefined): number | undefined {
  if (header === undefined) return undefined;
  const trimmed = header.trim();
  if (trimmed === "") return undefined;
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum >= 0) return asNum * 1000;
  const asDate = Date.parse(trimmed);
  if (Number.isNaN(asDate)) return undefined;
  return Math.max(0, asDate - Date.now());
}

export function computeBackoffMs(
  attempt: number,
  cfg: RetryConfig,
  retryAfterHeader: string | undefined,
  random: () => number = Math.random,
): number {
  const explicit = parseRetryAfter(retryAfterHeader);
  if (explicit !== undefined) return Math.min(explicit, cfg.maxDelayMs);

  const exp = cfg.baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(exp, cfg.maxDelayMs);
  if (cfg.jitter === "none") return capped;
  return capped * random();
}

export function shouldRetryStatus(status: number, cfg: RetryConfig): boolean {
  return cfg.retryOn.includes(status);
}

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal!.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
```

- [ ] **Step 16.4: Verify tests pass**

Run:

```bash
pnpm test tests/unit/core/retry.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 16.5: Commit**

```bash
git add src/core/retry.ts tests/unit/core/retry.test.ts
git commit -m "feat: add exponential backoff with full jitter and Retry-After support"
```

---

## Task 17: Implement core request pipeline

**Files:**

- Create: `src/core/request.ts`
- Test: `tests/unit/core/request.test.ts`

This task ties together rate-limit, retry, fetch, zod validation, and `Result` mapping. It's the most intricate piece. Tests use a stubbed `fetch` (no `vi.useFakeTimers` — we let real `setTimeout` fire with tiny delays).

- [ ] **Step 17.1: Write failing tests**

Create `tests/unit/core/request.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { request, type RequestArgs } from "../../../src/core/request.js";
import { TokenBucket } from "../../../src/core/rate-limit.js";
import { DEFAULT_RETRY } from "../../../src/core/retry.js";

const paramsSchema = z.object({ year: z.number().int() });
const responseSchema = z.object({ ok: z.literal(true), n: z.number() });

function buildArgs(
  overrides: Partial<RequestArgs<{ year: number }, { ok: true; n: number }>> = {},
) {
  return {
    apiKey: "test-key",
    baseUrl: "https://example.test",
    path: "/x",
    params: { year: 2024 },
    paramsSchema,
    responseSchema,
    bucket: new TokenBucket({ capacity: 100, refillPerSecond: 100 }),
    retry: { ...DEFAULT_RETRY, baseDelayMs: 1, maxDelayMs: 5, maxAttempts: 3 },
    timeoutMs: 5_000,
    fetch: vi.fn(),
    ...overrides,
  } as RequestArgs<{ year: number }, { ok: true; n: number }>;
}

describe("request", () => {
  it("returns ok with parsed data on 200", async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ ok: true, n: 42 }), { status: 200 }),
    );
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ ok: true, n: 42 });
  });

  it("sets the Ocp-Apim-Subscription-Key header", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, n: 1 })));
    const args = buildArgs({ fetch: fetchFn });
    await request(args);
    const [, init] = fetchFn.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get("Ocp-Apim-Subscription-Key")).toBe("test-key");
  });

  it("encodes params as query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, n: 1 })));
    const args = buildArgs({ fetch: fetchFn, params: { year: 2024 } });
    await request(args);
    const [url] = fetchFn.mock.calls[0]!;
    expect(String(url)).toBe("https://example.test/x?year=2024");
  });

  it("returns validation err on bad params (no fetch)", async () => {
    const fetchFn = vi.fn();
    const args = buildArgs({
      fetch: fetchFn,
      params: { year: "not a number" } as unknown as { year: number },
    });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("validation");
      if (r.error.kind === "validation") expect(r.error.phase).toBe("params");
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns validation err on bad response shape", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: true, n: "string!" })));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("validation");
      if (r.error.kind === "validation") expect(r.error.phase).toBe("response");
    }
  });

  it("returns api err on 4xx without retry", async () => {
    const fetchFn = vi.fn(async () => new Response("bad", { status: 400 }));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === "api") {
      expect(r.error.status).toBe(400);
      expect(r.error.attempts).toBe(1);
    }
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries on 503 up to maxAttempts then returns api err", async () => {
    const fetchFn = vi.fn(async () => new Response("nope", { status: 503 }));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === "api") {
      expect(r.error.status).toBe(503);
      expect(r.error.attempts).toBe(3);
    }
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("retries 503 then succeeds on second attempt", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, n: 7 })));
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.n).toBe(7);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("returns network err with attempts on fetch reject", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("connection reset");
    });
    const args = buildArgs({ fetch: fetchFn });
    const r = await request(args);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === "network") {
      expect(r.error.attempts).toBe(3);
    }
  });

  it("returns aborted on caller signal", async () => {
    const fetchFn = vi.fn(async (_url, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
      });
    });
    const ac = new AbortController();
    const args = buildArgs({ fetch: fetchFn, signal: ac.signal });
    const p = request(args);
    queueMicrotask(() => ac.abort(new Error("user cancel")));
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("aborted");
  });
});
```

- [ ] **Step 17.2: Verify failure**

Run:

```bash
pnpm test tests/unit/core/request.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 17.3: Implement**

Create `src/core/request.ts`:

```ts
import type { ZodType } from "zod";
import type { ReinfolibError } from "./errors.js";
import { err, ok, type Result } from "./result.js";
import type { TokenBucket } from "./rate-limit.js";
import {
  DEFAULT_RETRY,
  computeBackoffMs,
  shouldRetryStatus,
  sleep,
  type RetryConfig,
} from "./retry.js";

export type RequestArgs<P, R> = {
  apiKey: string;
  baseUrl: string;
  path: string;
  params: P;
  paramsSchema: ZodType<P>;
  responseSchema: ZodType<R>;
  bucket: TokenBucket | undefined; // undefined = rate limit disabled
  retry: RetryConfig;
  timeoutMs: number;
  signal?: AbortSignal;
  fetch: typeof globalThis.fetch;
  userAgent?: string;
};

function buildUrl(baseUrl: string, path: string, params: Record<string, unknown>): string {
  const u = new URL(path, baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function isAbortError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: string }).name === "AbortError";
}

export async function request<P, R>(a: RequestArgs<P, R>): Promise<Result<R, ReinfolibError>> {
  // Phase 1: params validation
  const parsedParams = a.paramsSchema.safeParse(a.params);
  if (!parsedParams.success) {
    return err({ kind: "validation", phase: "params", issues: parsedParams.error.issues });
  }

  const url = buildUrl(a.baseUrl, a.path, parsedParams.data as Record<string, unknown>);
  const maxAttempts = Math.max(1, a.retry.maxAttempts);
  let lastError: ReinfolibError | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (a.signal?.aborted) return err({ kind: "aborted", cause: a.signal.reason });

    // Phase 2: rate-limit gate
    if (a.bucket) {
      try {
        await a.bucket.acquire(a.signal);
      } catch (cause) {
        return err({ kind: "aborted", cause });
      }
    }

    // Phase 3: fetch
    const timeoutAc = new AbortController();
    const timeoutId = setTimeout(() => timeoutAc.abort(new Error("request timeout")), a.timeoutMs);
    const callerAbortListener = () => timeoutAc.abort(a.signal!.reason);
    a.signal?.addEventListener("abort", callerAbortListener, { once: true });

    let res: Response;
    try {
      const headers: Record<string, string> = {
        "Ocp-Apim-Subscription-Key": a.apiKey,
        Accept: "application/json",
      };
      if (a.userAgent) headers["User-Agent"] = a.userAgent;
      res = await a.fetch(url, { method: "GET", headers, signal: timeoutAc.signal });
    } catch (cause) {
      clearTimeout(timeoutId);
      a.signal?.removeEventListener("abort", callerAbortListener);

      if (a.signal?.aborted) return err({ kind: "aborted", cause });
      if (isAbortError(cause)) {
        lastError = { kind: "timeout", timeoutMs: a.timeoutMs, attempts: attempt };
      } else {
        lastError = { kind: "network", cause, attempts: attempt };
      }
      if (attempt < maxAttempts) {
        await sleep(computeBackoffMs(attempt, a.retry, undefined), a.signal);
        continue;
      }
      return err(lastError);
    }
    clearTimeout(timeoutId);
    a.signal?.removeEventListener("abort", callerAbortListener);

    // Phase 4: status handling
    if (!res.ok) {
      if (shouldRetryStatus(res.status, a.retry) && attempt < maxAttempts) {
        const retryAfter = res.headers.get("Retry-After") ?? undefined;
        await sleep(computeBackoffMs(attempt, a.retry, retryAfter), a.signal);
        continue;
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => undefined);
      }
      return err({ kind: "api", status: res.status, body, attempts: attempt });
    }

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
  }

  // Unreachable in practice (loop always returns), but TS requires it.
  return err(
    lastError ?? {
      kind: "network",
      cause: new Error("retry loop exhausted"),
      attempts: maxAttempts,
    },
  );
}
```

- [ ] **Step 17.4: Verify tests pass**

Run:

```bash
pnpm test tests/unit/core/request.test.ts
```

Expected: 10 tests pass.

- [ ] **Step 17.5: Commit**

```bash
git add src/core/request.ts tests/unit/core/request.test.ts
git commit -m "feat: add core request pipeline with rate-limit, retry, and zod validation"
```

---

## Task 18: Implement common param schemas

**Files:**

- Create: `src/core/common.ts`
- Test: `tests/unit/core/common.test.ts`

- [ ] **Step 18.1: Write failing test**

Create `tests/unit/core/common.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  prefCodeSchema,
  cityCodeSchema,
  stationCodeSchema,
  yearSchema,
  quarterSchema,
  languageSchema,
} from "../../../src/core/common.js";

describe("common schemas", () => {
  it("prefCode accepts 2 digits", () => {
    expect(prefCodeSchema.safeParse("13").success).toBe(true);
    expect(prefCodeSchema.safeParse("01").success).toBe(true);
    expect(prefCodeSchema.safeParse("1").success).toBe(false);
    expect(prefCodeSchema.safeParse("130").success).toBe(false);
    expect(prefCodeSchema.safeParse("ab").success).toBe(false);
  });

  it("cityCode accepts 5 digits", () => {
    expect(cityCodeSchema.safeParse("13102").success).toBe(true);
    expect(cityCodeSchema.safeParse("1310").success).toBe(false);
    expect(cityCodeSchema.safeParse("131020").success).toBe(false);
  });

  it("stationCode accepts 6 digits", () => {
    expect(stationCodeSchema.safeParse("003003").success).toBe(true);
    expect(stationCodeSchema.safeParse("003").success).toBe(false);
  });

  it("year accepts 4-digit years 2005+", () => {
    expect(yearSchema.safeParse("2005").success).toBe(true);
    expect(yearSchema.safeParse("2025").success).toBe(true);
    expect(yearSchema.safeParse("2004").success).toBe(false);
    expect(yearSchema.safeParse("99").success).toBe(false);
  });

  it("quarter is 1..4", () => {
    for (const q of ["1", "2", "3", "4"]) expect(quarterSchema.safeParse(q).success).toBe(true);
    expect(quarterSchema.safeParse("0").success).toBe(false);
    expect(quarterSchema.safeParse("5").success).toBe(false);
  });

  it("language is ja|en", () => {
    expect(languageSchema.safeParse("ja").success).toBe(true);
    expect(languageSchema.safeParse("en").success).toBe(true);
    expect(languageSchema.safeParse("fr").success).toBe(false);
  });
});
```

- [ ] **Step 18.2: Verify failure**

Run:

```bash
pnpm test tests/unit/core/common.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 18.3: Implement**

Create `src/core/common.ts`:

```ts
import { z } from "zod";

export const prefCodeSchema = z.string().regex(/^\d{2}$/);
export const cityCodeSchema = z.string().regex(/^\d{5}$/);
export const stationCodeSchema = z.string().regex(/^\d{6}$/);

export const yearSchema = z
  .string()
  .regex(/^\d{4}$/)
  .refine((v) => Number(v) >= 2005, "year must be >= 2005");

export const quarterSchema = z.enum(["1", "2", "3", "4"]);

export const languageSchema = z.enum(["ja", "en"]);

// Comma-separated lists (e.g. multiple area codes)
export const commaListOf = <T extends z.ZodType<string>>(item: T) =>
  z
    .string()
    .refine(
      (v) => v.split(",").every((s) => item.safeParse(s.trim()).success),
      "all comma-separated values must match the item schema",
    );
```

- [ ] **Step 18.4: Verify tests pass**

Run:

```bash
pnpm test tests/unit/core/common.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 18.5: Commit**

```bash
git add src/core/common.ts tests/unit/core/common.test.ts
git commit -m "feat: add common parameter zod schemas"
```

---

## Task 19: Implement `ReinfolibClient` skeleton

**Files:**

- Create: `src/client.ts`
- Create: `src/index.ts`
- Test: `tests/unit/client.test.ts`

`prices` is initialized as an empty object here; Task 20 attaches the first endpoint method.

- [ ] **Step 19.1: Write failing test**

Create `tests/unit/client.test.ts`:

```ts
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

  it("rejects empty apiKey", () => {
    expect(() => new ReinfolibClient({ apiKey: "" })).toThrow();
  });

  it("uses the provided baseUrl override", () => {
    const c = new ReinfolibClient({ apiKey: "k", baseUrl: "https://custom.example/" });
    expect(c.baseUrl).toBe("https://custom.example/");
  });
});
```

- [ ] **Step 19.2: Verify failure**

Run:

```bash
pnpm test tests/unit/client.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 19.3: Implement**

Create `src/client.ts`:

```ts
import { TokenBucket } from "./core/rate-limit.js";
import { DEFAULT_RETRY, type RetryConfig } from "./core/retry.js";

export type RateLimitOption = false | { capacity: number; refillPerSecond: number };
export type RetryOption = false | Partial<RetryConfig>;

export type ReinfolibClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  userAgent?: string;
  rateLimit?: RateLimitOption;
  retry?: RetryOption;
  fetch?: typeof globalThis.fetch;
};

export type CallOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  retry?: RetryOption;
};

const DEFAULT_BASE_URL = "https://www.reinfolib.mlit.go.jp";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT = { capacity: 10, refillPerSecond: 5 } as const;

export class ReinfolibClient {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly userAgent: string | undefined;
  readonly bucket: TokenBucket | undefined;
  readonly retry: RetryConfig;
  readonly fetch: typeof globalThis.fetch;

  // Category facades — populated as endpoints are added.
  readonly prices: Record<string, unknown> = {};

  constructor(opts: ReinfolibClientOptions) {
    if (!opts.apiKey) throw new Error("ReinfolibClient: apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.userAgent = opts.userAgent;
    this.fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);

    const rl = opts.rateLimit ?? DEFAULT_RATE_LIMIT;
    this.bucket = rl === false ? undefined : new TokenBucket(rl);

    this.retry =
      opts.retry === false
        ? { ...DEFAULT_RETRY, maxAttempts: 1 }
        : { ...DEFAULT_RETRY, ...opts.retry };
  }
}
```

Create `src/index.ts`:

```ts
export { ReinfolibClient } from "./client.js";
export type {
  ReinfolibClientOptions,
  CallOptions,
  RateLimitOption,
  RetryOption,
} from "./client.js";
export { ok, err } from "./core/result.js";
export type { Result, Ok, Err } from "./core/result.js";
export type { ReinfolibError } from "./core/errors.js";
export type { RetryConfig, Jitter } from "./core/retry.js";
export type { TokenBucketConfig } from "./core/rate-limit.js";
```

- [ ] **Step 19.4: Verify tests pass**

Run:

```bash
pnpm test tests/unit/client.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 19.5: Commit**

```bash
git add src/client.ts src/index.ts tests/unit/client.test.ts
git commit -m "feat: add ReinfolibClient skeleton with category facade stubs"
```

---

## Task 20: Implement XIT001 endpoint

XIT001 = real estate transaction price information.

**Endpoint:** `GET /ex-api/external/XIT001`

**Request params** (per the API manual):

- `year` (required, string `YYYY`, >= 2005; 2005 only Q3-Q4)
- `quarter` (required, string `1`..`4`)
- At least one of `area` (prefCode `NN`), `city` (cityCode `NNNNN`), `station` (stationCode `NNNNNN`); each may be comma-separated
- `priceClassification` (optional, `01` = transaction-price only, `02` = contract-price only, omit = both)
- `language` (optional, `ja`|`en`)

**Response:** JSON envelope `{ status, data: TransactionRecord[] }` (gzip-encoded on the wire; Node's fetch decodes transparently). All `data[]` fields are strings.

**Files:**

- Create: `src/endpoints/prices/xit001.ts`
- Modify: `src/client.ts` — wire `prices.transactionPoints`
- Test: `tests/unit/endpoints/prices/xit001.test.ts`
- Test: `tests/fixtures/xit001.json`

- [ ] **Step 20.1: Capture a fixture**

Run (uses the live API; requires the key from spec context):

```bash
mkdir -p tests/fixtures
curl --compressed -sS \
  -H "Ocp-Apim-Subscription-Key: YOUR_API_KEY" \
  "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?year=2024&quarter=2&city=13102&language=en" \
  -o tests/fixtures/xit001.json
```

Then verify it's parseable JSON and has the expected envelope:

```bash
node -e 'const j=require("./tests/fixtures/xit001.json"); if(!Array.isArray(j.data)) throw new Error("data missing"); console.log("records:", j.data.length, "keys:", Object.keys(j.data[0]||{}));'
```

Expected: prints record count and the field names. If the response is empty (rare), retry with a different `city` like `13101`.

- [ ] **Step 20.2: Write failing test**

Create `tests/unit/endpoints/prices/xit001.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ReinfolibClient } from "../../../../src/client.js";
import { paramsSchema, responseSchema, call } from "../../../../src/endpoints/prices/xit001.js";

const fixture = JSON.parse(readFileSync(resolve("tests/fixtures/xit001.json"), "utf8"));

describe("XIT001 params schema", () => {
  it("accepts a minimal valid request (city only)", () => {
    const r = paramsSchema.safeParse({ year: "2024", quarter: "2", city: "13102" });
    expect(r.success).toBe(true);
  });

  it("requires at least one of area/city/station", () => {
    const r = paramsSchema.safeParse({ year: "2024", quarter: "2" });
    expect(r.success).toBe(false);
  });

  it("rejects bad year", () => {
    expect(paramsSchema.safeParse({ year: "2004", quarter: "2", city: "13102" }).success).toBe(
      false,
    );
    expect(paramsSchema.safeParse({ year: "24", quarter: "2", city: "13102" }).success).toBe(false);
  });

  it("accepts priceClassification 01 or 02", () => {
    expect(
      paramsSchema.safeParse({
        year: "2024",
        quarter: "2",
        city: "13102",
        priceClassification: "01",
      }).success,
    ).toBe(true);
    expect(
      paramsSchema.safeParse({
        year: "2024",
        quarter: "2",
        city: "13102",
        priceClassification: "03",
      }).success,
    ).toBe(false);
  });

  it("accepts comma-separated area codes", () => {
    expect(paramsSchema.safeParse({ year: "2024", quarter: "2", area: "13,14" }).success).toBe(
      true,
    );
    expect(paramsSchema.safeParse({ year: "2024", quarter: "2", area: "13,abc" }).success).toBe(
      false,
    );
  });
});

describe("XIT001 response schema", () => {
  it("parses the captured fixture", () => {
    const r = responseSchema.safeParse(fixture);
    if (!r.success) console.error(r.error.issues);
    expect(r.success).toBe(true);
  });
});

describe("XIT001 call()", () => {
  it("returns ok with parsed data", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await call(client, { year: "2024", quarter: "2", city: "13102" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.status).toBe(fixture.status);
  });

  it("sends correct query string", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    await call(client, { year: "2024", quarter: "2", city: "13102", priceClassification: "01" });
    const url = String(fetchFn.mock.calls[0]![0]);
    expect(url).toContain("year=2024");
    expect(url).toContain("quarter=2");
    expect(url).toContain("city=13102");
    expect(url).toContain("priceClassification=01");
  });
});

describe("ReinfolibClient.prices.transactionPoints", () => {
  it("is wired and delegates to XIT001 call()", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const client = new ReinfolibClient({ apiKey: "k", fetch: fetchFn, rateLimit: false });
    const res = await client.prices.transactionPoints({
      year: "2024",
      quarter: "2",
      city: "13102",
    });
    expect(res.ok).toBe(true);
  });
});
```

- [ ] **Step 20.3: Verify failure**

Run:

```bash
pnpm test tests/unit/endpoints/prices/xit001.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 20.4: Implement the endpoint module**

Create `src/endpoints/prices/xit001.ts`:

```ts
import { z } from "zod";
import {
  cityCodeSchema,
  commaListOf,
  languageSchema,
  prefCodeSchema,
  quarterSchema,
  stationCodeSchema,
  yearSchema,
} from "../../core/common.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";
import { DEFAULT_RETRY } from "../../core/retry.js";

const recordSchema = z
  .object({
    Type: z.string().optional(),
    Region: z.string().optional(),
    MunicipalityCode: z.string().optional(),
    Prefecture: z.string().optional(),
    Municipality: z.string().optional(),
    DistrictName: z.string().optional(),
    TradePrice: z.string().optional(),
    PricePerUnit: z.string().optional(),
    FloorPlan: z.string().optional(),
    Area: z.string().optional(),
    UnitPrice: z.string().optional(),
    LandShape: z.string().optional(),
    Frontage: z.string().optional(),
    TotalFloorArea: z.string().optional(),
    BuildingYear: z.string().optional(),
    Structure: z.string().optional(),
    Use: z.string().optional(),
    Purpose: z.string().optional(),
    Direction: z.string().optional(),
    Classification: z.string().optional(),
    Breadth: z.string().optional(),
    CityPlanning: z.string().optional(),
    CoverageRatio: z.string().optional(),
    FloorAreaRatio: z.string().optional(),
    Period: z.string().optional(),
    Renovation: z.string().optional(),
    Remarks: z.string().optional(),
    PriceCategory: z.string().optional(),
    DistrictCode: z.string().optional(),
  })
  .passthrough(); // tolerate new fields from the API

export const responseSchema = z.object({
  status: z.string(),
  data: z.array(recordSchema),
});
export type Response = z.infer<typeof responseSchema>;

export const paramsSchema = z
  .object({
    year: yearSchema,
    quarter: quarterSchema,
    area: commaListOf(prefCodeSchema).optional(),
    city: commaListOf(cityCodeSchema).optional(),
    station: commaListOf(stationCodeSchema).optional(),
    priceClassification: z.enum(["01", "02"]).optional(),
    language: languageSchema.optional(),
  })
  .refine((v) => v.area !== undefined || v.city !== undefined || v.station !== undefined, {
    message: "At least one of area, city, or station is required",
  });
export type Params = z.infer<typeof paramsSchema>;

export const endpoint = { id: "XIT001", path: "/ex-api/external/XIT001" } as const;

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
    retry: retry ?? DEFAULT_RETRY,
    timeoutMs: opts.timeoutMs ?? client.timeoutMs,
    signal: opts.signal,
    fetch: client.fetch,
    userAgent: client.userAgent,
  });
}
```

- [ ] **Step 20.5: Wire into the client**

Modify `src/client.ts`. Replace the existing `prices` declaration:

```ts
readonly prices: Record<string, unknown> = {};
```

With:

```ts
readonly prices: {
  transactionPoints: (
    params: import("./endpoints/prices/xit001.js").Params,
    opts?: CallOptions,
  ) => ReturnType<typeof import("./endpoints/prices/xit001.js").call>;
};
```

And inside the constructor, after the `this.retry = ...` line, append:

```ts
this.prices = {
  transactionPoints: (params, opts) => xit001.call(this, params, opts),
};
```

At the top of `src/client.ts`, add:

```ts
import * as xit001 from "./endpoints/prices/xit001.js";
```

- [ ] **Step 20.6: Verify all tests pass**

Run:

```bash
pnpm test
```

Expected: all tests pass (smoke + result + rate-limit + retry + request + common + client + xit001).

- [ ] **Step 20.7: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 20.8: Commit**

```bash
git add src/endpoints src/client.ts tests/unit/endpoints tests/fixtures/xit001.json
git commit -m "feat(prices): add XIT001 transaction-points endpoint"
```

---

## Task 21: Integration test (opt-in)

**Files:**

- Create: `tests/integration/xit001.test.ts`
- Create: `vitest.integration.config.ts` (separate include path)

- [ ] **Step 21.1: Write the integration test**

Create `tests/integration/xit001.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ReinfolibClient } from "../../src/index.js";

const apiKey = process.env.REINFOLIB_API_KEY;
const runIt = process.env.INTEGRATION === "1" && apiKey ? it : it.skip;

describe("XIT001 — live", () => {
  runIt(
    "hits the real endpoint and parses the response",
    async () => {
      const client = new ReinfolibClient({ apiKey: apiKey! });
      const res = await client.prices.transactionPoints({
        year: "2024",
        quarter: "2",
        city: "13102",
        language: "en",
      });
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

- [ ] **Step 21.2: Create integration vitest config**

Create `vitest.integration.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
```

Modify `package.json` `scripts.test:integration` to:

```json
"test:integration": "INTEGRATION=1 vitest run --config vitest.integration.config.ts"
```

- [ ] **Step 21.3: Verify it skips without env**

Run:

```bash
pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 1 skipped (since `INTEGRATION` is unset).

- [ ] **Step 21.4: (Manual) Verify it passes with env**

Run (manual — do not bake the key into CI):

```bash
INTEGRATION=1 REINFOLIB_API_KEY=YOUR_API_KEY \
  pnpm exec vitest run --config vitest.integration.config.ts
```

Expected: 1 test passes.

- [ ] **Step 21.5: Commit**

```bash
git add tests/integration vitest.integration.config.ts package.json
git commit -m "test: add opt-in XIT001 integration test"
```

---

## Task 22: Write README

**Files:**

- Modify: `README.md`

- [ ] **Step 22.1: Replace the stub README**

Overwrite `README.md`:

````markdown
# @a1678991/reinfolib

TypeScript client for the [MLIT 不動産情報ライブラリ (Real Estate Information Library) API](https://www.reinfolib.mlit.go.jp/help/apiManual/).

- All request/response shapes typed with [zod 4](https://zod.dev/).
- `Result<T, E>` return type — no thrown errors from `client.*` methods.
- Built-in **configurable token-bucket rate limiting** and **retry with exponential backoff + full jitter** (honors `Retry-After`).
- Node.js 24+, ESM only.

> **v0.1.0** ships with the XIT001 transaction-price endpoint. Remaining 30 endpoints land in v0.2.0+.

## Install

```bash
# requires authenticating to GitHub Packages — see below
pnpm add @a1678991/reinfolib
```

### Authenticating to GitHub Packages

Add to your project's `.npmrc`:

```
@a1678991:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Where `GITHUB_TOKEN` is a personal access token with `read:packages`.

## Quickstart

```ts
import { ReinfolibClient } from "@a1678991/reinfolib";

const client = new ReinfolibClient({
  apiKey: process.env.REINFOLIB_API_KEY!,
});

const res = await client.prices.transactionPoints({
  year: "2024",
  quarter: "2",
  city: "13102",
  language: "en",
});

if (!res.ok) {
  // res.error is a discriminated union: validation | api | network | timeout | aborted
  console.error(res.error);
  process.exit(1);
}

for (const record of res.data.data) {
  console.log(record.Prefecture, record.TradePrice);
}
```

## Configuration

```ts
new ReinfolibClient({
  apiKey: "...",
  baseUrl: "https://www.reinfolib.mlit.go.jp", // override for testing
  timeoutMs: 30_000,
  userAgent: "my-app/1.0",

  rateLimit: { capacity: 10, refillPerSecond: 5 }, // or `false` to disable
  retry: {
    maxAttempts: 4,
    baseDelayMs: 500,
    maxDelayMs: 30_000,
    jitter: "full", // or "none"
    retryOn: [408, 425, 429, 500, 502, 503, 504],
  }, // or `false` to disable

  fetch: globalThis.fetch, // override for tests
});
```

Per-call overrides:

```ts
const ac = new AbortController();
await client.prices.transactionPoints(params, {
  signal: ac.signal,
  timeoutMs: 5_000,
  retry: false,
});
```

## Error model

```ts
type ReinfolibError =
  | { kind: "validation"; phase: "params" | "response"; issues: ZodIssue[] }
  | { kind: "api"; status: number; body: unknown; attempts: number }
  | { kind: "network"; cause: unknown; attempts: number }
  | { kind: "timeout"; timeoutMs: number; attempts: number }
  | { kind: "aborted"; cause: unknown };
```

## Development

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Live integration test (uses your real API key):

```bash
INTEGRATION=1 REINFOLIB_API_KEY=... pnpm test:integration
```

## License

MIT
````

- [ ] **Step 22.2: Commit**

```bash
git add README.md
git commit -m "docs: write quickstart and configuration README"
```

---

## Task 23: First release

This task only documents what's required externally — there's no code to write. After the previous tasks land on `main`, semantic-release will compute the version, publish to GitHub Packages, and create the release.

- [ ] **Step 23.1: Push to GitHub**

Run (after creating the empty repo at https://github.com/a1678991/reinfolib):

```bash
git remote add origin https://github.com/a1678991/reinfolib.git
git push -u origin main
```

- [ ] **Step 23.2: Watch the Release workflow**

Go to https://github.com/a1678991/reinfolib/actions, find the `Release` run. It should:

1. Lint, typecheck, test, build.
2. semantic-release analyzes all commits since (no previous tag) — every `feat:` commit triggers a minor bump from `1.0.0` baseline (per semantic-release default for no-tag state, it starts at `1.0.0`).
3. Publish `@a1678991/reinfolib@1.0.0` to GitHub Packages.
4. Tag `v1.0.0`, create the GitHub Release.
5. Commit `CHANGELOG.md` + bumped `package.json` back to `main`.

Note: semantic-release with no previous tags publishes as `1.0.0` by default. If a `0.1.0` first release is wanted instead, add `initialVersion: "0.1.0"` config — for now, accept `1.0.0`.

- [ ] **Step 23.3: Verify the published package**

Run:

```bash
npm view @a1678991/reinfolib --registry=https://npm.pkg.github.com/
```

Expected: shows the published version, dist-tags, etc. (Requires `NPM_TOKEN` env set to a GH token with `read:packages` if the repo is private.)

- [ ] **Step 23.4: Install Renovate on the repo**

Visit https://github.com/apps/renovate, install on `a1678991/reinfolib`. The first PR ("Configure Renovate") will close itself because `renovate.json` is already committed.

---

## Self-Review

**Spec coverage:**

- §1 Purpose, §2 Scope (JSON-only subset): Task 20 (XIT001 reference endpoint). GIS endpoints + GeoJSON/PBF explicitly deferred to Plan 2 in plan front-matter. ✓
- §3 Toolchain: Tasks 2-8 install and configure every tool. ✓
- §4 Repository Layout: Tasks 1, 5-12, 19-21 create every file shown in the layout (minus the deferred GIS bits). ✓
- §5 Public API: Tasks 19 + 20 implement `ReinfolibClient` with the `prices.transactionPoints` accessor and per-call overrides. ✓
- §6 Core Request Pipeline: Tasks 13-17 (Result, Errors, TokenBucket, Retry, Request). ✓
- §7 Per-Endpoint Module Shape: Task 20 implements it exactly. ✓
- §8 Shared GeoJSON Schemas: **Deferred** — no GIS endpoints in this plan. ✓
- §9 Testing Strategy: Tasks 13-20 cover unit + fixtures; Task 21 covers integration. ✓
- §10 CI/CD: Tasks 11-12. ✓
- §11 Commit Lint + Hooks: Tasks 6-7. ✓
- §12 Renovate: Task 9 + Step 23.4. ✓
- §13 package.json: Tasks 1, 2, 21. ✓
- §14 Build & Module Output: Task 1 (tsconfigs) + Task 12 (CI builds). ✓

**Placeholder scan:** No "TBD" / "implement later" / "add appropriate error handling" / "similar to Task N". Code blocks present for every implementation step. Commands have expected output.

**Type consistency check:**

- `ReinfolibError` definition (Task 14) is used in `request.ts` (Task 17) and `xit001.ts` (Task 20). Field names (`attempts`, `phase`, `issues`, `status`, `body`, `cause`, `timeoutMs`) match across all uses. ✓
- `Result<T, E>` shape (`{ ok, data }` / `{ ok, error }`) consistent in tests and implementations. ✓
- `RetryConfig` and `DEFAULT_RETRY` imported the same way everywhere. ✓
- `TokenBucket.acquire(signal?)` signature matches the tests in Task 15 and the call site in Task 17. ✓
- `ReinfolibClient` field names (`apiKey`, `baseUrl`, `bucket`, `retry`, `fetch`, `userAgent`, `timeoutMs`) match between client.ts (Task 19) and xit001.ts (Task 20). ✓
- Endpoint module exports (`paramsSchema`, `responseSchema`, `endpoint`, `call`) match between Task 20 implementation and Task 20 tests. ✓

Plan is consistent and complete for the v0.1.0 scope.

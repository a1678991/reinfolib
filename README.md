# @a1678991/reinfolib

TypeScript client for the [MLIT 不動産情報ライブラリ (Real Estate Information Library) API](https://www.reinfolib.mlit.go.jp/help/apiManual/).

- All request/response shapes typed with [zod 4](https://zod.dev/).
- `Result<T, E>` return type — no thrown errors from `client.*` methods.
- Built-in **configurable token-bucket rate limiting** and **retry with exponential backoff + full jitter** (honors `Retry-After`).
- Node.js 24+, ESM only.

> **v1.5.0** completes the `urbanPlanning` category — 7 endpoints covering zoning, land-use zones, location optimization, fire prevention, district plans, high-use districts, and planned roads. Remaining 23 endpoints (facilities, demographics, disaster) land in v1.6.0+.

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

### Municipality list

```ts
const munis = await client.municipalities.list({ area: "13", language: "en" });
if (munis.ok) {
  for (const m of munis.data.data) {
    console.log(m.id, m.name);
  }
}
```

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

The same dual-format pattern applies to `client.prices.priceTiles(...)` (transaction/contract price points, XPT001) and `client.prices.landPriceTiles(...)` (published land prices, XPT002):

```ts
// Transaction price points (XPT001) — zoom 11..15
const priceTiles = await client.prices.priceTiles({
  z: 14,
  x: 14552,
  y: 6451,
  from: "20241",
  to: "20244",
});

// Published land prices (XPT002) — zoom 13..15
const landPrices = await client.prices.landPriceTiles({
  z: 14,
  x: 14552,
  y: 6451,
  year: "2024",
});
```

The full `urbanPlanning` family — all GIS, all dual-format — covers the major urban-planning data layers:

```ts
await client.urbanPlanning.zoning({ z, x, y }); // XKT001 — districts/zoning (Polygon)
await client.urbanPlanning.landUseZones({ z, x, y }); // XKT002 — land-use zones (Polygon)
await client.urbanPlanning.locationOptimization({ z, x, y }); // XKT003 — location optimization plans (Polygon)
await client.urbanPlanning.firePrevention({ z, x, y }); // XKT014 — fire prevention zones (Polygon)
await client.urbanPlanning.districtPlans({ z, x, y }); // XKT023 — district plans (Polygon)
await client.urbanPlanning.highUseDistricts({ z, x, y }); // XKT024 — high-use districts (Polygon)
await client.urbanPlanning.plannedRoads({ z, x, y }); // XKT030 — planned roads (LineString | MultiLineString)
```

All accept `{ format: "pbf" }` to receive raw `Uint8Array` instead of typed GeoJSON.

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

# Examples

Runnable demos that use `@a1678991/reinfolib` against the live MLIT API. Examples live here and are **not** included in the published npm package.

## Prerequisites

- Node.js 24+ (for `--experimental-strip-types`)
- A MLIT API key — set as `REINFOLIB_API_KEY`

## `quote-prices.ts`

Fetches real-estate transaction prices for a given municipality + quarter via XIT001.

### Run

```sh
# Most recent completed quarter, Tokyo Chuo (city code 13102), English labels
REINFOLIB_API_KEY=<key> pnpm example:prices --city 13102

# Pick a specific period
REINFOLIB_API_KEY=<key> pnpm example:prices --city 13102 --year 2024 --quarter 2

# Raw JSON output, first 5 records
REINFOLIB_API_KEY=<key> pnpm example:prices --city 13102 --json --limit 5

# Help
pnpm example:prices --help
```

### Sample output

```
status: OK
records: 10 of 529
year=2024 quarter=2 city=13102 lang=en

Type            District                Price (JPY)     Area (m²)   Built       Structure
--------------  ----------------------  --------------  ----------  ----------  --------------
Residential     Tsukishima              95000000        65          2018        RC
Residential     Kachidoki               210000000       120         2020        SRC
...
```

### Exit codes

- `0` — success
- `1` — usage / config error (missing `--city`, missing API key)
- `2` — validation error (params or response failed zod check)
- `3` — API error (4xx/5xx from MLIT)
- `4` — network error
- `5` — timeout
- `130` — aborted (SIGINT)

### What it demonstrates

- Constructing a `ReinfolibClient` with just an API key (defaults pick up rate limit + retry).
- Calling `client.prices.transactionPoints(...)` with required + optional params.
- Discriminating on the `Result<T, E>` union — no exceptions thrown by the client.
- Inspecting `ReinfolibError` by `kind` for actionable error handling.

## `quote-zoning.ts`

Fetches urban-planning zoning data for an XYZ vector tile via XKT001 — the reference GIS endpoint. Supports both GeoJSON (typed) and PBF (raw `Uint8Array`).

### Run

```sh
# Default GeoJSON, Tokyo Chuo / Chiyoda area at zoom 14
REINFOLIB_API_KEY=<key> pnpm example:zoning --z 14 --x 14552 --y 6451

# Raw PBF (Uint8Array) — prints byte count and a hex preview
REINFOLIB_API_KEY=<key> pnpm example:zoning --z 14 --x 14552 --y 6451 --format pbf

# Raw GeoJSON, first 3 features
REINFOLIB_API_KEY=<key> pnpm example:zoning --z 14 --x 14552 --y 6451 --json --limit 3

# Help
pnpm example:zoning --help
```

Tile coordinates follow the [XYZ scheme used by GSI maps](https://maps.gsi.go.jp/development/tileCoordCheck.html). Zoom range is `11..15`.

### Sample output (GeoJSON)

```
type:     FeatureCollection
features: 4 of 4
z=14 x=14552 y=6451

Prefecture      City                Kubun    Area Class.             Decided
--------------  ------------------  -------  ----------------------  ------------
東京都             千代田区                21       都市計画区域
東京都             中央区                 21       都市計画区域
東京都             千代田区                22       市街化区域
東京都             中央区                 22       市街化区域
```

### Sample output (PBF)

```
format: pbf
size:   693 bytes
z=14 x=14552 y=6451

first 20 bytes (hex): 1a b2 05 78 01 0a 04 68 69 74 73 28 80 20 12 33 12 1a 00 00

Feed bytes to @mapbox/vector-tile to decode to GeoJSON.
```

### Exit codes

Same convention as `quote-prices.ts` — `0` success, `1` usage error, `2` validation, `3` API, `4` network, `5` timeout, `130` aborted.

### What it demonstrates

- Calling `client.urbanPlanning.zoning(...)` for both GeoJSON (default) and PBF responses.
- The function overload on `opts.format` correctly narrows `res.data` to `Uint8Array` when `{ format: "pbf" }` is passed.
- Shared `Result<T, E>` / `ReinfolibError` discipline across all endpoint categories.

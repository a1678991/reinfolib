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

## `quote-appraisals.ts`

Fetches official land appraisal records (公示地価/基準地価) for a prefecture + usage division via XCT001. Records are returned with Japanese-keyed fields, so output is shown as compact JSON per record rather than a fixed-column table.

### Run

```sh
# All usage categories in Tokyo, 2025
REINFOLIB_API_KEY=<key> pnpm example:appraisals --year 2025 --area 13 --division 00 --limit 5

# Residential land in Tokyo + Kanagawa
REINFOLIB_API_KEY=<key> pnpm example:appraisals --year 2025 --area 13,14 --division 03

# Raw JSON envelope
REINFOLIB_API_KEY=<key> pnpm example:appraisals --year 2025 --area 13 --division 00 --json

# Help
pnpm example:appraisals --help
```

### Sample output

```
status: OK
records: 2 of 3322
year=2025 area=13 division=00

[0]
  {"価格時点":"2025","標準地番号 市区町村コード 県コード":"13", ...,"公示価格":"562000","変動率":"8.5","位置座標 緯度":"35.75932333","位置座標 経度":"139.72775472"}
[1]
  {"価格時点":"2025", ...,"公示価格":"565000","変動率":"9.1", ...}
```

### What it demonstrates

- Calling `client.prices.appraisals(...)` — the JSON endpoint with opaque Japanese-keyed records.
- Why dynamic keys prevent a static column table: the honest approach is to emit compact JSON per record.
- `division` enum validation client-side before sending to the API.

## `quote-price-tiles.ts`

Fetches real-estate transaction price tiles (取引価格情報) as GeoJSON or PBF via XPT001. Properties use English snake_case keys with `_ja`-suffix human-readable values.

### Run

```sh
# GeoJSON default — Tokyo Chuo area, all four quarters of 2024
REINFOLIB_API_KEY=<key> pnpm example:price-tiles --z 14 --x 14552 --y 6451 --from 20241 --to 20244

# Raw PBF bytes
REINFOLIB_API_KEY=<key> pnpm example:price-tiles --z 14 --x 14552 --y 6451 --from 20241 --to 20244 --format pbf

# Raw GeoJSON, first 3 features
REINFOLIB_API_KEY=<key> pnpm example:price-tiles --z 14 --x 14552 --y 6451 --from 20241 --to 20244 --json --limit 3

# Help
pnpm example:price-tiles --help
```

### Sample output (GeoJSON)

```
type:     FeatureCollection
features: 3 of 18
z=14 x=14552 y=6451 from=20241 to=20244

Prefecture      City                District            Price           Layout      Area        Period
--------------  ------------------  ------------------  --------------  ----------  ----------  ------------------
東京都             中央区                 日本橋                 7,500万円         １ＬＤＫ        40㎡         2024年第4四半期
東京都             中央区                 日本橋                 8,300万円         １ＬＤＫ        45㎡         2024年第1四半期
東京都             中央区                 八丁堀                 8,200万円         ２ＬＤＫ        55㎡         2024年第2四半期
```

### Exit codes

Same convention as `quote-prices.ts` — `0` success, `1` usage error, `2` validation, `3` API, `4` network, `5` timeout, `130` aborted.

### What it demonstrates

- Calling `client.prices.priceTiles(...)` with the PBF/GeoJSON overload — same pattern as `quote-zoning.ts`.
- Surfacing typed `_ja`-suffix property keys from XPT001's GeoJSON feature properties.
- Optional `--price-classification` and `--land-type-code` pass-through to the API.

## `quote-land-prices.ts`

Fetches official land-price survey point tiles (地価公示・地価調査) as GeoJSON or PBF via XPT002. Note: zoom range is **13..15** (one level finer than XPT001/XKT001's 11..15), and `priceClassification` uses `0|1` (not `01|02`).

### Run

```sh
# GeoJSON default — Tokyo Chuo area, 2024 survey
REINFOLIB_API_KEY=<key> pnpm example:land-prices --z 14 --x 14552 --y 6451 --year 2024

# Raw PBF bytes
REINFOLIB_API_KEY=<key> pnpm example:land-prices --z 14 --x 14552 --y 6451 --year 2024 --format pbf

# Residential only
REINFOLIB_API_KEY=<key> pnpm example:land-prices --z 14 --x 14552 --y 6451 --year 2024 --use-category-code 03

# Help
pnpm example:land-prices --help
```

### Exit codes

Same convention as `quote-prices.ts`.

### What it demonstrates

- Calling `client.prices.landPriceTiles(...)` — XPT002 shares the same overload pattern as XPT001 but has a narrower zoom range and different enum values for `priceClassification`.
- Highlights API-level differences worth knowing: zoom 13..15 only, `priceClassification: "0"|"1"`.

## `list-municipalities.ts`

Lists all municipalities (市区町村) for a given prefecture via XIT002. Useful for finding city codes to pass to `quote-prices.ts`.

### Run

```sh
# All municipalities in Tokyo (62 entries), English names
REINFOLIB_API_KEY=<key> pnpm example:municipalities --area 13 --limit 10

# Japanese names
REINFOLIB_API_KEY=<key> pnpm example:municipalities --area 13 --language ja

# Raw JSON envelope
REINFOLIB_API_KEY=<key> pnpm example:municipalities --area 13 --json --limit 3

# Help
pnpm example:municipalities --help
```

### Sample output

```
status: OK
municipalities: 10 of 62
area=13 language=en

ID        Name
--------  ------------------------------
13101     Chiyoda Ward
13102     Chuo Ward
13103     Minato Ward
13104     Shinjuku Ward
13105     Bunkyo Ward
```

### Exit codes

Same convention as `quote-prices.ts`.

### What it demonstrates

- Calling `client.municipalities.list(...)` — the simplest facade method, two params.
- Using `--language en` (the CLI default) vs `--language ja` to toggle label locale.
- Clean two-column tabular output from a flat `{ id, name }` record shape.

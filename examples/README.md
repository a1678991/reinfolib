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
REINFOLIB_API_KEY=<key> pnpm example --city 13102

# Pick a specific period
REINFOLIB_API_KEY=<key> pnpm example --city 13102 --year 2024 --quarter 2

# Raw JSON output, first 5 records
REINFOLIB_API_KEY=<key> pnpm example --city 13102 --json --limit 5

# Help
pnpm example --help
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

// Example: query MLIT real-estate transaction price tiles via XPT001.
//
// Run from the repo root:
//   REINFOLIB_API_KEY=<key> pnpm example:price-tiles --z 14 --x 14552 --y 6451 --from 20241 --to 20244
//   REINFOLIB_API_KEY=<key> pnpm example:price-tiles --z 14 --x 14552 --y 6451 --from 20241 --to 20244 --format pbf
//   REINFOLIB_API_KEY=<key> pnpm example:price-tiles --z 14 --x 14552 --y 6451 --from 20241 --to 20244 --json --limit 3
//
// The `pnpm example:price-tiles` script wraps `node --experimental-strip-types`.

import { parseArgs } from "node:util";
import { ReinfolibClient } from "@a1678991/reinfolib";

const USAGE = `Usage:
  REINFOLIB_API_KEY=<key> pnpm example:price-tiles --z <11..15> --x <N> --y <N> --from <YYYYN> --to <YYYYN> [options]

Required:
  --z <11..15>                  Zoom level (11 = city scale, 15 = detailed)
  --x <N>                       Tile X coordinate (XYZ scheme)
  --y <N>                       Tile Y coordinate (XYZ scheme)
  --from <YYYYN>                Start period, e.g. 20241 = Q1 2024
  --to <YYYYN>                  End period, e.g. 20244 = Q4 2024

Options:
  --price-classification <01|02>   01=MLIT survey, 02=prefectural survey (optional)
  --land-type-code <code>          01=residential 02=commercial 07=forest 10=farm 11=other
                                   Comma list allowed, e.g. 01,02 (optional)
  --format <geojson|pbf>           Response format (default: geojson)
  --limit <N>                      Max features/bytes to display (default 5)
  --json                           GeoJSON only: print raw JSON instead of a table
  -h, --help                       Show this help

XYZ tile coordinates follow https://maps.gsi.go.jp/development/tileCoordCheck.html
`;

const { values } = parseArgs({
  options: {
    z: { type: "string" },
    x: { type: "string" },
    y: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    "price-classification": { type: "string" },
    "land-type-code": { type: "string" },
    format: { type: "string", default: "geojson" },
    limit: { type: "string", default: "5" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (values.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}
if (values.z === undefined || values.x === undefined || values.y === undefined) {
  process.stderr.write(`error: --z, --x, and --y are all required\n\n${USAGE}`);
  process.exit(1);
}
if (values.from === undefined || values.to === undefined) {
  process.stderr.write(`error: --from and --to are both required\n\n${USAGE}`);
  process.exit(1);
}
if (values.format !== "geojson" && values.format !== "pbf") {
  process.stderr.write(`error: --format must be 'geojson' or 'pbf' (got ${values.format})\n`);
  process.exit(1);
}

const apiKey = process.env["REINFOLIB_API_KEY"];
if (apiKey === undefined || apiKey === "") {
  process.stderr.write("error: REINFOLIB_API_KEY env var is required\n");
  process.exit(1);
}

const z = Number.parseInt(values.z, 10);
const x = Number.parseInt(values.x, 10);
const y = Number.parseInt(values.y, 10);
if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
  process.stderr.write("error: --z, --x, --y must be integers\n");
  process.exit(1);
}

const limit = Math.max(0, Number.parseInt(values.limit, 10) || 5);
const client = new ReinfolibClient({ apiKey });

function reportError(err: unknown): never {
  process.stderr.write(`error: ${JSON.stringify(err, null, 2)}\n`);
  const kind = (err as { kind?: string }).kind;
  const exitByKind: Record<string, number> = {
    validation: 2,
    api: 3,
    network: 4,
    timeout: 5,
    aborted: 130,
  };
  process.exit(exitByKind[kind ?? ""] ?? 1);
}

const params = {
  z,
  x,
  y,
  from: values.from,
  to: values.to,
  ...(values["price-classification"] !== undefined
    ? { priceClassification: values["price-classification"] as "01" | "02" }
    : {}),
  ...(values["land-type-code"] !== undefined ? { landTypeCode: values["land-type-code"] } : {}),
};

if (values.format === "pbf") {
  const res = await client.prices.priceTiles(params, { format: "pbf" });
  if (!res.ok) reportError(res.error);
  const bytes = res.data;
  process.stdout.write(`format: pbf\n`);
  process.stdout.write(`size:   ${bytes.byteLength} bytes\n`);
  process.stdout.write(`z=${z} x=${x} y=${y} from=${values.from} to=${values.to}\n\n`);
  const preview = Array.from(bytes.slice(0, Math.min(limit * 4, bytes.byteLength)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  process.stdout.write(`first ${Math.min(limit * 4, bytes.byteLength)} bytes (hex): ${preview}\n`);
  process.stdout.write(`\nFeed bytes to @mapbox/vector-tile to decode to GeoJSON.\n`);
  process.exit(0);
}

const res = await client.prices.priceTiles(params);
if (!res.ok) reportError(res.error);

const features = res.data.features.slice(0, limit);

if (values.json) {
  const payload = {
    type: res.data.type,
    total: res.data.features.length,
    returned: features.length,
    features,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

process.stdout.write(`type:     ${res.data.type}\n`);
process.stdout.write(`features: ${features.length} of ${res.data.features.length}\n`);
process.stdout.write(`z=${z} x=${x} y=${y} from=${values.from} to=${values.to}\n\n`);

const columns = [
  { key: "prefecture_name_ja", label: "Prefecture", width: 14 },
  { key: "city_name_ja", label: "City", width: 18 },
  { key: "district_name_ja", label: "District", width: 18 },
  { key: "u_transaction_price_total_ja", label: "Price", width: 14 },
  { key: "floor_plan_name_ja", label: "Layout", width: 10 },
  { key: "u_area_ja", label: "Area", width: 10 },
  { key: "point_in_time_name_ja", label: "Period", width: 18 },
] as const;

const sep = columns.map((c) => "-".repeat(c.width)).join("  ");
const header = columns.map((c) => c.label.padEnd(c.width)).join("  ");
process.stdout.write(`${header}\n${sep}\n`);

for (const feature of features) {
  const props = feature.properties as Record<string, unknown>;
  const line = columns
    .map((c) =>
      String(props[c.key] ?? "")
        .padEnd(c.width)
        .slice(0, c.width),
    )
    .join("  ");
  process.stdout.write(`${line}\n`);
}

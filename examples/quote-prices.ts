// Example: query MLIT real-estate transaction prices for a given city + quarter.
//
// Run from the repo root:
//   REINFOLIB_API_KEY=<key> pnpm example --city 13102
//   REINFOLIB_API_KEY=<key> pnpm example --city 13102 --year 2024 --quarter 2
//   REINFOLIB_API_KEY=<key> pnpm example --city 13102 --json --limit 5
//
// The `pnpm example` script wraps `node --experimental-strip-types`.

import { parseArgs } from "node:util";
import { ReinfolibClient } from "@a1678991/reinfolib";

const USAGE = `Usage:
  REINFOLIB_API_KEY=<key> pnpm example --city <NNNNN> [options]

Required:
  --city <NNNNN>       5-digit municipality code (e.g. 13102 = Tokyo Chuo)

Options:
  --year <YYYY>        Default: most recent completed quarter
  --quarter <1..4>     Default: most recent completed quarter
  --lang <ja|en>       Default: en
  --limit <N>          Max records to display (default 10)
  --json               Print raw JSON instead of a table
  -h, --help           Show this help
`;

const { values } = parseArgs({
  options: {
    city: { type: "string" },
    year: { type: "string" },
    quarter: { type: "string" },
    lang: { type: "string", default: "en" },
    limit: { type: "string", default: "10" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (values.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}
if (values.city === undefined) {
  process.stderr.write(`error: --city is required\n\n${USAGE}`);
  process.exit(1);
}

const apiKey = process.env["REINFOLIB_API_KEY"];
if (apiKey === undefined || apiKey === "") {
  process.stderr.write("error: REINFOLIB_API_KEY env var is required\n");
  process.exit(1);
}

function defaultQuarter(): { year: string; quarter: string } {
  const now = new Date();
  const currentQ = Math.floor(now.getUTCMonth() / 3) + 1;
  if (currentQ === 1) {
    return { year: String(now.getUTCFullYear() - 1), quarter: "4" };
  }
  return { year: String(now.getUTCFullYear()), quarter: String(currentQ - 1) };
}

const fallback = defaultQuarter();
const year = values.year ?? fallback.year;
const quarterRaw = values.quarter ?? fallback.quarter;
if (quarterRaw !== "1" && quarterRaw !== "2" && quarterRaw !== "3" && quarterRaw !== "4") {
  process.stderr.write(`error: --quarter must be 1, 2, 3, or 4 (got ${quarterRaw})\n`);
  process.exit(1);
}
const quarter = quarterRaw;
const lang = values.lang === "ja" ? "ja" : "en";

const client = new ReinfolibClient({ apiKey });

const res = await client.prices.transactionPoints({
  year,
  quarter,
  city: values.city,
  language: lang,
});

if (!res.ok) {
  process.stderr.write(`error: ${JSON.stringify(res.error, null, 2)}\n`);
  const exitByKind: Record<string, number> = {
    validation: 2,
    api: 3,
    network: 4,
    timeout: 5,
    aborted: 130,
  };
  process.exit(exitByKind[res.error.kind] ?? 1);
}

const limit = Math.max(0, Number.parseInt(values.limit, 10) || 10);
const rows = res.data.data.slice(0, limit);

if (values.json) {
  const payload = {
    status: res.data.status,
    total: res.data.data.length,
    returned: rows.length,
    records: rows,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

process.stdout.write(`status: ${res.data.status}\n`);
process.stdout.write(`records: ${rows.length} of ${res.data.data.length}\n`);
process.stdout.write(`year=${year} quarter=${quarter} city=${values.city} lang=${lang}\n\n`);

const columns = [
  { key: "Type", label: "Type", width: 14 },
  { key: "DistrictName", label: "District", width: 22 },
  { key: "TradePrice", label: "Price (JPY)", width: 14 },
  { key: "Area", label: "Area (m²)", width: 10 },
  { key: "BuildingYear", label: "Built", width: 10 },
  { key: "Structure", label: "Structure", width: 14 },
] as const;

const sep = columns.map((c) => "-".repeat(c.width)).join("  ");
const header = columns.map((c) => c.label.padEnd(c.width)).join("  ");
process.stdout.write(`${header}\n${sep}\n`);

for (const row of rows) {
  const r = row as Record<string, string | undefined>;
  const line = columns.map((c) => (r[c.key] ?? "").padEnd(c.width).slice(0, c.width)).join("  ");
  process.stdout.write(`${line}\n`);
}

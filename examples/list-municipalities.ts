// Example: list municipalities for a prefecture via XIT002.
//
// Run from the repo root:
//   REINFOLIB_API_KEY=<key> pnpm example:municipalities --area 13
//   REINFOLIB_API_KEY=<key> pnpm example:municipalities --area 13 --language ja
//   REINFOLIB_API_KEY=<key> pnpm example:municipalities --area 13 --json --limit 3
//
// The `pnpm example:municipalities` script wraps `node --experimental-strip-types`.

import { parseArgs } from "node:util";
import { ReinfolibClient } from "@a1678991/reinfolib";

const USAGE = `Usage:
  REINFOLIB_API_KEY=<key> pnpm example:municipalities --area <NN> [options]

Required:
  --area <NN>            Prefecture code, 2-digit (01..47), e.g. 13 = Tokyo

Options:
  --language <ja|en>     Label language (default: en)
  --limit <N>            Max records to display (default 100)
  --json                 Print raw JSON instead of a table
  -h, --help             Show this help
`;

const { values } = parseArgs({
  options: {
    area: { type: "string" },
    language: { type: "string", default: "en" },
    limit: { type: "string", default: "100" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

if (values.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}
if (values.area === undefined) {
  process.stderr.write(`error: --area is required\n\n${USAGE}`);
  process.exit(1);
}
if (values.language !== "ja" && values.language !== "en") {
  process.stderr.write(`error: --language must be 'ja' or 'en' (got ${values.language})\n`);
  process.exit(1);
}

const apiKey = process.env["REINFOLIB_API_KEY"];
if (apiKey === undefined || apiKey === "") {
  process.stderr.write("error: REINFOLIB_API_KEY env var is required\n");
  process.exit(1);
}

const limit = Math.max(0, Number.parseInt(values.limit, 10) || 100);
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

const res = await client.municipalities.list({
  area: values.area,
  language: values.language,
});

if (!res.ok) reportError(res.error);

const rows = res.data.data.slice(0, limit);

if (values.json) {
  const payload = {
    status: res.data.status,
    total: res.data.data.length,
    returned: rows.length,
    municipalities: rows,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

process.stdout.write(`status: ${res.data.status}\n`);
process.stdout.write(`municipalities: ${rows.length} of ${res.data.data.length}\n`);
process.stdout.write(`area=${values.area} language=${values.language}\n\n`);

const idWidth = 8;
const nameWidth = 30;
const sep = `${"-".repeat(idWidth)}  ${"-".repeat(nameWidth)}`;
const header = `${"ID".padEnd(idWidth)}  ${"Name".padEnd(nameWidth)}`;
process.stdout.write(`${header}\n${sep}\n`);

for (const row of rows) {
  const line = `${row.id.padEnd(idWidth).slice(0, idWidth)}  ${row.name.padEnd(nameWidth).slice(0, nameWidth)}`;
  process.stdout.write(`${line}\n`);
}

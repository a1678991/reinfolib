// Example: query MLIT land-price appraisals (公示地価/基準地価) via XCT001.
//
// Run from the repo root:
//   REINFOLIB_API_KEY=<key> pnpm example:appraisals --year 2025 --area 13 --division 00
//   REINFOLIB_API_KEY=<key> pnpm example:appraisals --year 2025 --area 13,14 --division 00 --limit 10
//   REINFOLIB_API_KEY=<key> pnpm example:appraisals --year 2025 --area 13 --division 00 --json
//
// The `pnpm example:appraisals` script wraps `node --experimental-strip-types`.

import { parseArgs } from "node:util";
import { ReinfolibClient } from "@a1678991/reinfolib";

const USAGE = `Usage:
  REINFOLIB_API_KEY=<key> pnpm example:appraisals --year <YYYY> --area <NN[,NN...]> --division <code> [options]

Required:
  --year <YYYY>            Appraisal year (2022..2026)
  --area <NN[,NN...]>      Prefecture code(s), 2-digit (e.g. 13 = Tokyo, 13,14 = Tokyo+Kanagawa)
  --division <code>        Usage category: 00=all 03=residential 05=commercial 07=industrial
                           09=semi-residential 10=quasi-industrial 13=quasi-commercial 20=other

Options:
  --limit <N>              Max records to display (default 5)
  --json                   Print raw JSON instead of a summary
  -h, --help               Show this help
`;

const { values } = parseArgs({
  options: {
    year: { type: "string" },
    area: { type: "string" },
    division: { type: "string" },
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
if (values.year === undefined) {
  process.stderr.write(`error: --year is required\n\n${USAGE}`);
  process.exit(1);
}
if (values.area === undefined) {
  process.stderr.write(`error: --area is required\n\n${USAGE}`);
  process.exit(1);
}
if (values.division === undefined) {
  process.stderr.write(`error: --division is required\n\n${USAGE}`);
  process.exit(1);
}

const validDivisions = ["00", "03", "05", "07", "09", "10", "13", "20"] as const;
type Division = (typeof validDivisions)[number];
if (!(validDivisions as readonly string[]).includes(values.division)) {
  process.stderr.write(
    `error: --division must be one of ${validDivisions.join(", ")} (got ${values.division})\n`,
  );
  process.exit(1);
}

const apiKey = process.env["REINFOLIB_API_KEY"];
if (apiKey === undefined || apiKey === "") {
  process.stderr.write("error: REINFOLIB_API_KEY env var is required\n");
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

const res = await client.prices.appraisals({
  year: values.year,
  area: values.area,
  division: values.division as Division,
});

if (!res.ok) reportError(res.error);

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
process.stdout.write(`year=${values.year} area=${values.area} division=${values.division}\n\n`);

for (const [i, record] of rows.entries()) {
  process.stdout.write(`[${i}]\n  ${JSON.stringify(record)}\n`);
}

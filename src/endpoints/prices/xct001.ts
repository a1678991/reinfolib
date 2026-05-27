import { z } from "zod";
import { commaListOf, prefCodeSchema } from "../../core/common.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

const yearSchema = z
  .string()
  .regex(/^\d{4}$/)
  .refine((v) => {
    const n = Number(v);
    return n >= 2022 && n <= 2026;
  }, "year must be in 2022..2026");

const divisionSchema = z.enum(["00", "03", "05", "07", "09", "10", "13", "20"]);

export const paramsSchema = z.object({
  year: yearSchema,
  area: commaListOf(prefCodeSchema),
  division: divisionSchema,
});
export type Params = z.infer<typeof paramsSchema>;

// XCT001 returns Japanese-named keys regardless of any language param.
// Records are typed as opaque objects; access fields by their actual Japanese names.
const recordSchema = z.object({}).passthrough();

export const responseSchema = z.object({
  status: z.string(),
  data: z.array(recordSchema),
});
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XCT001", path: "/ex-api/external/XCT001" } as const;

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
    retry,
    timeoutMs: opts.timeoutMs ?? client.timeoutMs,
    ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    fetch: client.fetch,
    ...(client.userAgent !== undefined ? { userAgent: client.userAgent } : {}),
  }) as Promise<Result<Response, ReinfolibError>>;
}

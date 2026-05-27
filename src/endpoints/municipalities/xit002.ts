import { z } from "zod";
import { languageSchema, prefCodeSchema } from "../../core/common.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

export const paramsSchema = z.object({
  area: prefCodeSchema,
  language: languageSchema.optional(),
});
export type Params = z.infer<typeof paramsSchema>;

const recordSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .passthrough();

// Actual response is `{ status: "OK", data: [...] }` — wrapped envelope per Task 9 capture.
export const responseSchema = z.object({
  status: z.string(),
  data: z.array(recordSchema),
});
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XIT002", path: "/ex-api/external/XIT002" } as const;

export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptions = {},
): Promise<Result<Response, ReinfolibError>> {
  const retry =
    opts.retry === false ? { ...client.retry, maxAttempts: 1 } : { ...client.retry, ...opts.retry };

  const args = {
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
    path: endpoint.path,
    params,
    paramsSchema,
    responseSchema,
    bucket: client.bucket,
    retry,
    timeoutMs: opts.timeoutMs ?? client.timeoutMs,
    fetch: client.fetch,
    ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    ...(client.userAgent !== undefined ? { userAgent: client.userAgent } : {}),
  };

  return request(args) as Promise<Result<Response, ReinfolibError>>;
}

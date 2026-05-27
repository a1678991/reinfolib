import { z } from "zod";
import { tileCoordSchema, zoomSchema, withResponseFormat } from "../../core/common.js";
import {
  FeatureCollectionSchema,
  MultiPolygonGeometry,
  PolygonGeometry,
} from "../../core/geojson.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

export const paramsSchema = z.object({
  z: zoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
});
export type Params = z.infer<typeof paramsSchema>;

const propsSchema = z
  .object({
    prefecture: z.string().optional(),
    city_code: z.string().optional(),
    city_name: z.string().optional(),
    kubun_id: z.number().int().optional(),
    decision_date: z.string().optional(),
    decision_classification: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number: z.string().optional(),
    area_classification_ja: z.string().optional(),
    first_decision_date: z.string().optional(),
    notice_number_s: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(
  z.union([PolygonGeometry, MultiPolygonGeometry]),
  propsSchema,
);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XKT001", path: "/ex-api/external/XKT001" } as const;

export type CallOptsGeoJson = CallOptions & { format?: "geojson" | undefined };
export type CallOptsPbf = CallOptions & { format: "pbf" };

export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptsPbf,
): Promise<Result<Uint8Array, ReinfolibError>>;
export function call(
  client: ReinfolibClient,
  params: Params,
  opts?: CallOptsGeoJson,
): Promise<Result<Response, ReinfolibError>>;
export function call(
  client: ReinfolibClient,
  params: Params,
  opts: CallOptions & { format?: "geojson" | "pbf" | undefined } = {},
): Promise<Result<Response | Uint8Array, ReinfolibError>> {
  const format = opts.format ?? "geojson";
  const apiParams = { ...params, response_format: format };
  const retry =
    opts.retry === false ? { ...client.retry, maxAttempts: 1 } : { ...client.retry, ...opts.retry };

  return request({
    apiKey: client.apiKey,
    baseUrl: client.baseUrl,
    path: endpoint.path,
    params: apiParams,
    paramsSchema: withResponseFormat(paramsSchema),
    responseSchema,
    bucket: client.bucket,
    retry,
    timeoutMs: opts.timeoutMs ?? client.timeoutMs,
    fetch: client.fetch,
    ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    ...(client.userAgent !== undefined ? { userAgent: client.userAgent } : {}),
    responseKind: format === "pbf" ? "binary" : "json",
  });
}

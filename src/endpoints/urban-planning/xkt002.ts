import { z } from "zod";
import { tileCoordSchema, zoomSchema } from "../../core/common.js";
import {
  FeatureCollectionSchema,
  MultiPolygonGeometry,
  PolygonGeometry,
} from "../../core/geojson.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { callGis } from "../../core/request.js";
import type { Result } from "../../core/result.js";

export const paramsSchema = z.object({
  z: zoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
});
export type Params = z.infer<typeof paramsSchema>;

const propsSchema = z
  .object({
    youto_id: z.number().int().optional(),
    prefecture: z.string().optional(),
    city_code: z.string().optional(),
    city_name: z.string().optional(),
    decision_date: z.string().optional(),
    decision_classification: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number: z.string().optional(),
    use_area_ja: z.string().optional(),
    u_floor_area_ratio_ja: z.string().optional(),
    u_building_coverage_ratio_ja: z.string().optional(),
    first_decision_date: z.string().optional(),
    notice_number_s: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(
  z.union([PolygonGeometry, MultiPolygonGeometry]),
  propsSchema,
);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XKT002", path: "/ex-api/external/XKT002" } as const;

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
  return callGis({ client, endpoint, params, paramsSchema, responseSchema, opts });
}

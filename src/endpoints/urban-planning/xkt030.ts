import { z } from "zod";
import { tileCoordSchema, zoomSchema } from "../../core/common.js";
import {
  FeatureCollectionSchema,
  LineStringGeometry,
  MultiLineStringGeometry,
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
    planning_road_ja: z.string().optional(),
    kubun_id: z.number().int().optional(),
    prefecture: z.string().optional(),
    city_code: z.string().optional(),
    city_name: z.string().optional(),
    first_decision_date: z.string().optional(),
    decision_date: z.string().optional(),
    decision_type_ja: z.string().optional(),
    decision_maker: z.string().optional(),
    notice_number_s: z.string().optional(),
    notice_number: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(
  z.union([LineStringGeometry, MultiLineStringGeometry]),
  propsSchema,
);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XKT030", path: "/ex-api/external/XKT030" } as const;

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

import { z } from "zod";
import { commaListOf, tileCoordSchema, zoomSchema } from "../../core/common.js";
import { FeatureCollectionSchema, PointGeometry } from "../../core/geojson.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { callGis } from "../../core/request.js";
import type { Result } from "../../core/result.js";

const periodSchema = z.string().regex(/^\d{4}[1-4]$/, "must be YYYYN where N is 1..4");
const landTypeCodeSchema = z.enum(["01", "02", "07", "10", "11"]);

export const paramsSchema = z.object({
  z: zoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
  from: periodSchema,
  to: periodSchema,
  priceClassification: z.enum(["01", "02"]).optional(),
  landTypeCode: commaListOf(landTypeCodeSchema).optional(),
});
export type Params = z.infer<typeof paramsSchema>;

const propsSchema = z
  .object({
    price_information_category_name_ja: z.string().optional(),
    prefecture_name_ja: z.string().optional(),
    city_name_ja: z.string().optional(),
    district_name_ja: z.string().optional(),
    u_transaction_price_total_ja: z.string().optional(),
    u_unit_price_per_tsubo_ja: z.string().optional(),
    floor_plan_name_ja: z.string().optional(),
    u_area_ja: z.string().optional(),
    u_transaction_price_unit_price_square_meter_ja: z.string().optional(),
    u_construction_year_ja: z.string().optional(),
    building_structure_name_ja: z.string().optional(),
    land_use_name_ja: z.string().optional(),
    point_in_time_name_ja: z.string().optional(),
    land_type_name_ja: z.string().optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(PointGeometry, propsSchema);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XPT001", path: "/ex-api/external/XPT001" } as const;

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

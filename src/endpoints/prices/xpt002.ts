import { z } from "zod";
import { commaListOf, tileCoordSchema } from "../../core/common.js";
import { FeatureCollectionSchema, PointGeometry } from "../../core/geojson.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { callGis } from "../../core/request.js";
import type { Result } from "../../core/result.js";

const xpt002ZoomSchema = z.number().int().min(13).max(15);
const yearStringSchema = z
  .string()
  .regex(/^\d{4}$/)
  .refine((v) => {
    const n = Number(v);
    return n >= 1995 && n <= 2024;
  }, "year must be in 1995..2024");
const useCategoryCodeSchema = z.enum(["00", "03", "05", "07", "09", "10", "13", "20"]);

export const paramsSchema = z.object({
  z: xpt002ZoomSchema,
  x: tileCoordSchema,
  y: tileCoordSchema,
  year: yearStringSchema,
  priceClassification: z.enum(["0", "1"]).optional(),
  useCategoryCode: commaListOf(useCategoryCodeSchema).optional(),
});
export type Params = z.infer<typeof paramsSchema>;

// Real-response fields differ from MLIT's documented field list; use .passthrough()
// and declare a small representative subset (`*_ja` suffix common) for autocomplete.
const propsSchema = z
  .object({
    location_number_ja: z.string().optional(),
    area_division_name_ja: z.string().optional(),
    city_code: z.string().optional(),
    residence_display_name_ja: z.string().optional(),
    building_structure_name_ja: z.string().optional(),
    u_road_distance_to_nearest_station_name_ja: z.string().optional(),
    side_road_name_ja: z.string().optional(),
    sewer_supply_availability: z.union([z.string(), z.boolean()]).optional(),
  })
  .passthrough();

export const responseSchema = FeatureCollectionSchema(PointGeometry, propsSchema);
export type Response = z.infer<typeof responseSchema>;

export const endpoint = { id: "XPT002", path: "/ex-api/external/XPT002" } as const;

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

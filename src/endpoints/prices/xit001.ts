import { z } from "zod";
import {
  cityCodeSchema,
  commaListOf,
  languageSchema,
  prefCodeSchema,
  quarterSchema,
  stationCodeSchema,
  yearSchema,
} from "../../core/common.js";
import type { ReinfolibClient, CallOptions } from "../../client.js";
import type { ReinfolibError } from "../../core/errors.js";
import { request } from "../../core/request.js";
import type { Result } from "../../core/result.js";

const recordSchema = z
  .object({
    Type: z.string().optional(),
    Region: z.string().optional(),
    MunicipalityCode: z.string().optional(),
    Prefecture: z.string().optional(),
    Municipality: z.string().optional(),
    DistrictName: z.string().optional(),
    TradePrice: z.string().optional(),
    PricePerUnit: z.string().optional(),
    FloorPlan: z.string().optional(),
    Area: z.string().optional(),
    UnitPrice: z.string().optional(),
    LandShape: z.string().optional(),
    Frontage: z.string().optional(),
    TotalFloorArea: z.string().optional(),
    BuildingYear: z.string().optional(),
    Structure: z.string().optional(),
    Use: z.string().optional(),
    Purpose: z.string().optional(),
    Direction: z.string().optional(),
    Classification: z.string().optional(),
    Breadth: z.string().optional(),
    CityPlanning: z.string().optional(),
    CoverageRatio: z.string().optional(),
    FloorAreaRatio: z.string().optional(),
    Period: z.string().optional(),
    Renovation: z.string().optional(),
    Remarks: z.string().optional(),
    PriceCategory: z.string().optional(),
    DistrictCode: z.string().optional(),
  })
  .passthrough(); // tolerate new fields from the API

export const responseSchema = z.object({
  status: z.string(),
  data: z.array(recordSchema),
});
export type Response = z.infer<typeof responseSchema>;

export const paramsSchema = z
  .object({
    year: yearSchema,
    quarter: quarterSchema,
    area: commaListOf(prefCodeSchema).optional(),
    city: commaListOf(cityCodeSchema).optional(),
    station: commaListOf(stationCodeSchema).optional(),
    priceClassification: z.enum(["01", "02"]).optional(),
    language: languageSchema.optional(),
  })
  .refine((v) => v.area !== undefined || v.city !== undefined || v.station !== undefined, {
    message: "At least one of area, city, or station is required",
  });
export type Params = z.infer<typeof paramsSchema>;

export const endpoint = { id: "XIT001", path: "/ex-api/external/XIT001" } as const;

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

  return request(args);
}

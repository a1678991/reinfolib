import { z } from "zod";

export const prefCodeSchema = z.string().regex(/^\d{2}$/);
export const cityCodeSchema = z.string().regex(/^\d{5}$/);
export const stationCodeSchema = z.string().regex(/^\d{6}$/);

export const yearSchema = z
  .string()
  .regex(/^\d{4}$/)
  .refine((v) => Number(v) >= 2005, "year must be >= 2005");

export const quarterSchema = z.enum(["1", "2", "3", "4"]);

export const languageSchema = z.enum(["ja", "en"]);

// Comma-separated lists (e.g. multiple area codes)
export const commaListOf = <T extends z.ZodType<string>>(item: T) =>
  z
    .string()
    .refine(
      (v) => v.split(",").every((s) => item.safeParse(s.trim()).success),
      "all comma-separated values must match the item schema",
    );

export const zoomSchema = z.number().int().min(11).max(15);
export const tileCoordSchema = z.number().int().nonnegative();

export const responseFormatSchema = z.enum(["geojson", "pbf"]);

export const withResponseFormat = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({ response_format: responseFormatSchema });

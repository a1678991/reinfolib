import { z } from "zod";

const Position = z.tuple([z.number(), z.number()]);

export const PointGeometry = z.object({
  type: z.literal("Point"),
  coordinates: Position,
});

export const LineStringGeometry = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(Position).min(2),
});

const LinearRing = z.array(Position).min(4); // first == last enforced by API conventions, not asserted here
export const PolygonGeometry = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(LinearRing).min(1),
});

export const MultiPolygonGeometry = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(LinearRing).min(1)).min(1),
});

export function FeatureCollectionSchema<G extends z.ZodTypeAny, P extends z.ZodTypeAny>(
  geometry: G,
  properties: P,
) {
  return z.object({
    type: z.literal("FeatureCollection"),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        geometry,
        properties,
      }),
    ),
  });
}

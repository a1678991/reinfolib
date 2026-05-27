import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  PointGeometry,
  LineStringGeometry,
  MultiLineStringGeometry,
  PolygonGeometry,
  MultiPolygonGeometry,
  FeatureCollectionSchema,
} from "../../../src/core/geojson.js";

describe("PointGeometry", () => {
  it("parses a valid Point", () => {
    expect(PointGeometry.safeParse({ type: "Point", coordinates: [139.7, 35.6] }).success).toBe(
      true,
    );
  });
  it("rejects wrong type", () => {
    expect(PointGeometry.safeParse({ type: "Polygon", coordinates: [139.7, 35.6] }).success).toBe(
      false,
    );
  });
  it("rejects non-pair coordinates", () => {
    expect(PointGeometry.safeParse({ type: "Point", coordinates: [139.7] }).success).toBe(false);
  });
});

describe("PolygonGeometry", () => {
  it("parses a single-ring polygon", () => {
    const r = PolygonGeometry.safeParse({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("MultiPolygonGeometry", () => {
  it("parses a multi-polygon", () => {
    const r = MultiPolygonGeometry.safeParse({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        [
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2],
          ],
        ],
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("LineStringGeometry", () => {
  it("parses a valid LineString", () => {
    const r = LineStringGeometry.safeParse({
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("MultiLineStringGeometry", () => {
  it("parses a multi-linestring", () => {
    const r = MultiLineStringGeometry.safeParse({
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
        [
          [2, 2],
          [3, 3],
        ],
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("FeatureCollectionSchema", () => {
  const props = z.object({ name: z.string() });
  const schema = FeatureCollectionSchema(PointGeometry, props);

  it("parses a valid FeatureCollection", () => {
    const r = schema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { name: "origin" },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects wrong top-level type", () => {
    const r = schema.safeParse({ type: "Feature", features: [] });
    expect(r.success).toBe(false);
  });

  it("rejects features with wrong geometry", () => {
    const r = schema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [] },
          properties: { name: "x" },
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects features with missing required property", () => {
    const r = schema.safeParse({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: {},
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

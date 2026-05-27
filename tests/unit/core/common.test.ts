import { describe, it, expect } from "vitest";
import {
  prefCodeSchema,
  cityCodeSchema,
  stationCodeSchema,
  yearSchema,
  quarterSchema,
  languageSchema,
  zoomSchema,
  tileCoordSchema,
} from "../../../src/core/common.js";

describe("common schemas", () => {
  it("prefCode accepts 2 digits", () => {
    expect(prefCodeSchema.safeParse("13").success).toBe(true);
    expect(prefCodeSchema.safeParse("01").success).toBe(true);
    expect(prefCodeSchema.safeParse("1").success).toBe(false);
    expect(prefCodeSchema.safeParse("130").success).toBe(false);
    expect(prefCodeSchema.safeParse("ab").success).toBe(false);
  });

  it("cityCode accepts 5 digits", () => {
    expect(cityCodeSchema.safeParse("13102").success).toBe(true);
    expect(cityCodeSchema.safeParse("1310").success).toBe(false);
    expect(cityCodeSchema.safeParse("131020").success).toBe(false);
  });

  it("stationCode accepts 6 digits", () => {
    expect(stationCodeSchema.safeParse("003003").success).toBe(true);
    expect(stationCodeSchema.safeParse("003").success).toBe(false);
  });

  it("year accepts 4-digit years 2005+", () => {
    expect(yearSchema.safeParse("2005").success).toBe(true);
    expect(yearSchema.safeParse("2025").success).toBe(true);
    expect(yearSchema.safeParse("2004").success).toBe(false);
    expect(yearSchema.safeParse("99").success).toBe(false);
  });

  it("quarter is 1..4", () => {
    for (const q of ["1", "2", "3", "4"]) expect(quarterSchema.safeParse(q).success).toBe(true);
    expect(quarterSchema.safeParse("0").success).toBe(false);
    expect(quarterSchema.safeParse("5").success).toBe(false);
  });

  it("language is ja|en", () => {
    expect(languageSchema.safeParse("ja").success).toBe(true);
    expect(languageSchema.safeParse("en").success).toBe(true);
    expect(languageSchema.safeParse("fr").success).toBe(false);
  });
});

describe("ztile schemas", () => {
  it("zoom accepts 11..15", () => {
    for (const z of [11, 12, 13, 14, 15]) expect(zoomSchema.safeParse(z).success).toBe(true);
    expect(zoomSchema.safeParse(10).success).toBe(false);
    expect(zoomSchema.safeParse(16).success).toBe(false);
    expect(zoomSchema.safeParse(13.5).success).toBe(false);
  });

  it("tileCoord accepts non-negative integers", () => {
    expect(tileCoordSchema.safeParse(0).success).toBe(true);
    expect(tileCoordSchema.safeParse(14626).success).toBe(true);
    expect(tileCoordSchema.safeParse(-1).success).toBe(false);
    expect(tileCoordSchema.safeParse(1.5).success).toBe(false);
  });
});

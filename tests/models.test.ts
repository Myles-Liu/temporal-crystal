import { describe, it, expect } from "vitest";
import {
  createMemory,
  createCrystal,
  MemoryLayer,
  ageDays,
  shouldCompress,
  nextLayer,
  crystalStrength,
} from "../src/models.js";

describe("Memory", () => {
  it("creates with defaults", () => {
    const mem = createMemory("Hello world");
    expect(mem.content).toBe("Hello world");
    expect(mem.layer).toBe(MemoryLayer.RAW);
    expect(mem.importance).toBe(0.5);
    expect(mem.id).toHaveLength(12);
  });

  it("calculates age", () => {
    const old = createMemory("old", {
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    });
    expect(ageDays(old.createdAt)).toBeGreaterThanOrEqual(9.9);
  });

  it("detects when compression is due", () => {
    const fresh = createMemory("fresh");
    expect(shouldCompress(fresh)).toBe(false);

    const old = createMemory("old", {
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    });
    expect(shouldCompress(old)).toBe(true);
  });

  it("returns correct next layer", () => {
    expect(nextLayer(MemoryLayer.RAW)).toBe(MemoryLayer.COMPRESSED);
    expect(nextLayer(MemoryLayer.COMPRESSED)).toBe(MemoryLayer.ABSTRACT);
    expect(nextLayer(MemoryLayer.ABSTRACT)).toBe(MemoryLayer.CRYSTAL);
    expect(nextLayer(MemoryLayer.CRYSTAL)).toBeNull();
  });
});

describe("Crystal", () => {
  it("calculates strength", () => {
    const weak = createCrystal("test", { evidence: ["a"], confidence: 0.5 });
    expect(crystalStrength(weak)).toBeCloseTo(0.05);

    const strong = createCrystal("test", {
      evidence: Array.from({ length: 10 }, (_, i) => String(i)),
      confidence: 0.9,
    });
    expect(crystalStrength(strong)).toBeCloseTo(0.9);
  });
});

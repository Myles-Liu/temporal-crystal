import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createMemory, createCrystal, MemoryLayer } from "../src/models.js";
import { MemoryStore } from "../src/store.js";

describe("MemoryStore", () => {
  let store: MemoryStore;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "tc-test-"));
    store = new MemoryStore(join(tmp, "memory"));
  });

  it("adds and retrieves memory", () => {
    const mem = createMemory("Test memory");
    store.add(mem);
    const retrieved = store.get(mem.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.content).toBe("Test memory");
    expect(retrieved!.layer).toBe(MemoryLayer.RAW);
  });

  it("lists memories by layer", () => {
    store.add(createMemory("M1"));
    store.add(createMemory("M2"));
    store.add(createMemory("M3"));
    expect(store.listLayer(MemoryLayer.RAW)).toHaveLength(3);
  });

  it("deletes memory", () => {
    const mem = createMemory("To delete");
    store.add(mem);
    expect(store.get(mem.id)).not.toBeNull();
    store.delete(mem.id);
    expect(store.get(mem.id)).toBeNull();
  });

  it("reports stats", () => {
    store.add(createMemory("M1"));
    store.add(createMemory("M2"));
    const s = store.stats();
    expect(s.raw).toBe(2);
    expect(s.total).toBeGreaterThanOrEqual(2);
  });

  it("adds and lists crystals", () => {
    const crystal = createCrystal("Test pattern", { evidence: ["a", "b", "c"] });
    store.addCrystal(crystal);
    const crystals = store.listCrystals();
    expect(crystals).toHaveLength(1);
    expect(crystals[0].insight).toBe("Test pattern");
  });
});

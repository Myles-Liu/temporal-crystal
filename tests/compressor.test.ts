import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createMemory, MemoryLayer } from "../src/models.js";
import { MemoryStore } from "../src/store.js";
import { Compressor } from "../src/compressor.js";

describe("Compressor", () => {
  let store: MemoryStore;
  let compressor: Compressor;

  beforeEach(() => {
    const tmp = mkdtempSync(join(tmpdir(), "tc-test-"));
    store = new MemoryStore(join(tmp, "memory"));
    compressor = new Compressor(store);
  });

  it("does nothing for fresh memories", () => {
    store.add(createMemory("Fresh memory"));
    const results = compressor.compressDue();
    expect(results).toHaveLength(0);
  });

  it("compresses old memories", () => {
    for (let i = 0; i < 3; i++) {
      store.add(
        createMemory(`Old memory ${i}`, {
          createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        })
      );
    }
    const results = compressor.compressDue();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].action).toBe("compress");
    expect(results[0].toLayer).toBe("compressed");
  });

  it("dry run does not modify store", () => {
    for (let i = 0; i < 3; i++) {
      store.add(
        createMemory(`Old memory ${i}`, {
          createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        })
      );
    }
    const before = store.stats();
    compressor.compressDue(true);
    const after = store.stats();
    expect(before).toEqual(after);
  });
});

/**
 * Simple test runner — no vitest needed.
 */

import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createMemory,
  createCrystal,
  MemoryLayer,
  ageDays,
  shouldCompress,
  nextLayer,
  crystalStrength,
  defaultConfig,
} from "../src/models.js";
import { MemoryStore } from "../src/store.js";
import { Compressor } from "../src/compressor.js";

let passed = 0;
let failed = 0;
const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];

function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

async function runTests() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (e: any) {
      console.log(`  ❌ ${name}: ${e.message}`);
      failed++;
    }
  }
}

function tmpStore(): MemoryStore {
  const tmp = mkdtempSync(join(tmpdir(), "tc-test-"));
  return new MemoryStore(join(tmp, "memory"));
}

// --- Model tests ---

console.log("\n📦 Models\n");

test("creates memory with defaults", () => {
  const mem = createMemory("Hello world");
  assert.equal(mem.content, "Hello world");
  assert.equal(mem.layer, MemoryLayer.RAW);
  assert.equal(mem.importance, 0.5);
  assert.equal(mem.id.length, 12);
});

test("calculates age", () => {
  const old = createMemory("old", {
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  });
  assert.ok(ageDays(old.createdAt) >= 9.9);
});

test("detects compression due", () => {
  const fresh = createMemory("fresh");
  assert.equal(shouldCompress(fresh), false);
  const old = createMemory("old", {
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  });
  assert.equal(shouldCompress(old), true);
});

test("returns correct next layer", () => {
  assert.equal(nextLayer(MemoryLayer.RAW), MemoryLayer.COMPRESSED);
  assert.equal(nextLayer(MemoryLayer.COMPRESSED), MemoryLayer.ABSTRACT);
  assert.equal(nextLayer(MemoryLayer.ABSTRACT), MemoryLayer.CRYSTAL);
  assert.equal(nextLayer(MemoryLayer.CRYSTAL), null);
});

test("crystal strength calculation", () => {
  const weak = createCrystal("test", { evidence: ["a"], confidence: 0.5 });
  assert.ok(Math.abs(crystalStrength(weak) - 0.05) < 0.001);
  const strong = createCrystal("test", {
    evidence: Array.from({ length: 10 }, (_, i) => String(i)),
    confidence: 0.9,
  });
  assert.ok(Math.abs(crystalStrength(strong) - 0.9) < 0.001);
});

// --- Store tests ---

console.log("\n📦 Store\n");

test("add and get memory", () => {
  const store = tmpStore();
  const mem = createMemory("Test memory");
  store.add(mem);
  const retrieved = store.get(mem.id);
  assert.ok(retrieved);
  assert.equal(retrieved!.content, "Test memory");
  assert.equal(retrieved!.layer, MemoryLayer.RAW);
});

test("list memories by layer", () => {
  const store = tmpStore();
  store.add(createMemory("M1"));
  store.add(createMemory("M2"));
  store.add(createMemory("M3"));
  assert.equal(store.listLayer(MemoryLayer.RAW).length, 3);
});

test("delete memory", () => {
  const store = tmpStore();
  const mem = createMemory("To delete");
  store.add(mem);
  assert.ok(store.get(mem.id));
  store.delete(mem.id);
  assert.equal(store.get(mem.id), null);
});

test("stats", () => {
  const store = tmpStore();
  store.add(createMemory("M1"));
  store.add(createMemory("M2"));
  const s = store.stats();
  assert.equal(s.raw, 2);
  assert.ok(s.total >= 2);
});

test("add and list crystals", () => {
  const store = tmpStore();
  const crystal = createCrystal("Test pattern", { evidence: ["a", "b", "c"] });
  store.addCrystal(crystal);
  const crystals = store.listCrystals();
  assert.equal(crystals.length, 1);
  assert.equal(crystals[0].insight, "Test pattern");
});

// --- Compressor tests ---

console.log("\n📦 Compressor\n");

test("nothing to compress for fresh memories", async () => {
  const store = tmpStore();
  store.add(createMemory("Fresh"));
  const compressor = new Compressor(store);
  const results = await compressor.compressDue();
  assert.equal(results.length, 0);
});

test("compresses old memories", async () => {
  const store = tmpStore();
  for (let i = 0; i < 3; i++) {
    store.add(createMemory(`Old ${i}`, {
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    }));
  }
  const compressor = new Compressor(store);
  const results = await compressor.compressDue();
  assert.ok(results.length >= 1);
  assert.equal(results[0].action, "compress");
  assert.equal(results[0].toLayer, "compressed");
});

test("dry run does not modify store", async () => {
  const store = tmpStore();
  for (let i = 0; i < 3; i++) {
    store.add(createMemory(`Old ${i}`, {
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    }));
  }
  const before = JSON.stringify(store.stats());
  const compressor = new Compressor(store);
  await compressor.compressDue(true);
  const after = JSON.stringify(store.stats());
  assert.equal(before, after);
});

// --- Run all ---

async function main() {
  await runTests();
  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ ${passed} passed  ❌ ${failed} failed  📊 ${passed + failed} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

// --- Recall tests ---

import { RecallEngine } from "../src/recall.js";

console.log("\n📦 Recall\n");

test("keyword search", async () => {
  const store = tmpStore();
  store.add(createMemory("Deployed webpack to production", { tags: ["deploy"] }));
  store.add(createMemory("Met with Zhang San about project", { tags: ["meeting"] }));
  store.add(createMemory("Fixed CSS bug in header", { tags: ["bugfix"] }));

  const engine = new RecallEngine(store);
  const result = await engine.search({ query: "webpack" });
  assert.ok(result.memories.length >= 1);
  assert.ok(result.memories[0].content.includes("webpack"));
});

test("tag filter", async () => {
  const store = tmpStore();
  store.add(createMemory("Deploy v1", { tags: ["deploy"] }));
  store.add(createMemory("Deploy v2", { tags: ["deploy"] }));
  store.add(createMemory("Bug fix", { tags: ["bugfix"] }));

  const engine = new RecallEngine(store);
  const result = await engine.search({ tags: ["deploy"] });
  assert.equal(result.memories.length, 2);
});

test("date range filter", async () => {
  const store = tmpStore();
  const old = createMemory("Old memory", {
    createdAt: new Date("2025-01-01").toISOString(),
  });
  const recent = createMemory("Recent memory", {
    createdAt: new Date("2026-03-01").toISOString(),
  });
  store.add(old);
  store.add(recent);

  const engine = new RecallEngine(store);
  const result = await engine.search({ fromDate: "2026-01-01" });
  assert.equal(result.memories.length, 1);
  assert.ok(result.memories[0].content.includes("Recent"));
});

// --- Dream tests ---

import { DreamEngine } from "../src/dream.js";

console.log("\n📦 Dream\n");

test("dream with enough memories", async () => {
  const store = tmpStore();
  store.add(createMemory("Memory A", { tags: ["work"] }));
  store.add(createMemory("Memory B", { tags: ["work"] }));
  store.add(createMemory("Memory C", { tags: ["personal"] }));
  store.add(createMemory("Memory D", { tags: ["work", "meeting"] }));

  const engine = new DreamEngine(store);
  const result = await engine.dream();
  assert.ok(result.sampledCount >= 3);
  assert.ok(result.themes.length > 0);
  assert.equal(result.themes[0].tag, "work"); // most frequent
});

test("dream with too few memories", async () => {
  const store = tmpStore();
  store.add(createMemory("Only one"));

  const engine = new DreamEngine(store);
  const result = await engine.dream();
  assert.ok(result.sampledCount <= 1);
});

// --- Visualization tests ---

import { generateHTML } from "../src/viz.js";

console.log("\n📦 Visualization\n");

test("generates HTML for empty store", () => {
  const store = tmpStore();
  const html = generateHTML(store);
  assert.ok(html.includes("Temporal Crystal Memory"));
  assert.ok(html.includes("Raw Layer"));
  assert.ok(html.includes("Compressed"));
  assert.ok(html.includes("Abstract"));
  assert.ok(html.includes("Crystal"));
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("</html>"));
});

test("generates HTML with custom title", () => {
  const store = tmpStore();
  const html = generateHTML(store, {
    title: "Custom Title",
    description: "Custom Description",
  });
  assert.ok(html.includes("Custom Title"));
  assert.ok(html.includes("Custom Description"));
});

test("includes memory layers with correct colors", () => {
  const store = tmpStore();
  store.add(createMemory("Raw memory", { layer: MemoryLayer.RAW }));
  store.add(createMemory("Compressed memory", { layer: MemoryLayer.COMPRESSED }));

  const html = generateHTML(store);
  assert.ok(html.includes("Raw Layer"));
  assert.ok(html.includes("Compressed Layer"));
  assert.ok(html.includes("#1976D2")); // Raw color
  assert.ok(html.includes("#388E3C")); // Compressed color
});

test("escapes HTML in content", () => {
  const store = tmpStore();
  store.add(createMemory("Content with <script>alert('xss')</script>"));

  const html = generateHTML(store);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert('xss')</script>"));
});

test("displays memory properties", () => {
  const store = tmpStore();
  store.add(createMemory("Test memory", {
    importance: 0.8,
    tags: ["important", "test"],
  }));

  const html = generateHTML(store);
  assert.ok(html.includes("Importance"));
  assert.ok(html.includes("80%"));
  assert.ok(html.includes("important"));
  assert.ok(html.includes("test"));
});

test("displays crystals", () => {
  const store = tmpStore();
  store.addCrystal(createCrystal("Important pattern", {
    confidence: 0.95,
    category: "behavior",
  }));

  const html = generateHTML(store);
  assert.ok(html.includes("💎 Crystals"));
  assert.ok(html.includes("Important pattern"));
  assert.ok(html.includes("Confidence"));
  assert.ok(html.includes("95%"));
});

test("includes inline CSS without CDN", () => {
  const store = tmpStore();
  const html = generateHTML(store);

  assert.ok(html.includes("<style>"));
  assert.ok(html.includes("</style>"));
  assert.ok(!html.includes("cdn."));
  assert.ok(!html.includes("https://"));
});

test("includes inline JavaScript", () => {
  const store = tmpStore();
  const html = generateHTML(store);

  assert.ok(html.includes("<script>"));
  assert.ok(html.includes("DOMContentLoaded"));
});

test("statistics bar displays correct counts", () => {
  const store = tmpStore();
  store.add(createMemory("M1", { layer: MemoryLayer.RAW }));
  store.add(createMemory("M2", { layer: MemoryLayer.RAW }));
  store.add(createMemory("M3", { layer: MemoryLayer.COMPRESSED }));

  const html = generateHTML(store);
  assert.ok(html.includes("Total Memories"));
  assert.ok(html.includes("Raw Layer"));
});

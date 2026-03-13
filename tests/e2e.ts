#!/usr/bin/env npx tsx
/**
 * End-to-end integration test.
 * Tests the full lifecycle: init → add → recall → compress → dream → stats
 */

import { mkdtempSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert";
import { MemoryStore } from "../src/store.js";
import { Compressor } from "../src/compressor.js";
import { RecallEngine } from "../src/recall.js";
import { DreamEngine } from "../src/dream.js";
import { createMemory, MemoryLayer } from "../src/models.js";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function freshStore(): MemoryStore {
  const dir = mkdtempSync(join(tmpdir(), "tc-e2e-"));
  return new MemoryStore(dir);
}

console.log("\n🔬 E2E Integration Tests\n");

await test("full lifecycle", async () => {
  const store = freshStore();

  // 1. Add memories — mix of old and new
  const oldDate = new Date(Date.now() - 10 * 86400000).toISOString();
  store.add(createMemory("Old: started auth refactor", {
    createdAt: oldDate, tags: ["auth", "refactor"], importance: 0.7,
  }));
  store.add(createMemory("Old: auth unit tests passing", {
    createdAt: oldDate, tags: ["auth", "test"], importance: 0.6,
  }));
  store.add(createMemory("Old: auth code review done", {
    createdAt: oldDate, tags: ["auth", "review"], importance: 0.5,
  }));
  store.add(createMemory("New: deployed frontend v3", {
    tags: ["deploy", "frontend"], importance: 0.9,
  }));
  store.add(createMemory("New: webpack Node 14 fix", {
    tags: ["bugfix", "webpack"], importance: 0.7,
  }));

  const stats1 = store.stats();
  assert.equal(stats1.raw, 5, "should have 5 raw");

  // 2. Recall search
  const recall = new RecallEngine(store);
  const r1 = await recall.search({ query: "auth" });
  assert.equal(r1.memories.length, 3, "auth search should find 3");

  const r2 = await recall.search({ tags: ["deploy"] });
  assert.equal(r2.memories.length, 1, "deploy tag should find 1");

  const r3 = await recall.search({ fromDate: new Date().toISOString().slice(0, 10) });
  assert.equal(r3.memories.length, 2, "today filter should find 2");

  // 3. Compress
  const compressor = new Compressor(store);
  const results = await compressor.compressDue();
  assert.ok(results.length >= 1, "should compress old memories");
  assert.equal(results[0].action, "compress");
  assert.equal(results[0].toLayer, "compressed");
  assert.equal(results[0].inputCount, 3);

  const stats2 = store.stats();
  assert.equal(stats2.raw, 2, "raw should drop to 2");
  assert.equal(stats2.compressed, 1, "compressed should be 1");

  // 4. Verify raw directory matches
  const rawFiles = readdirSync(join(store.path, "raw")).filter(f => f.endsWith(".json"));
  assert.equal(rawFiles.length, 2, "raw dir should have 2 files");

  // 5. Dream
  const dreamer = new DreamEngine(store);
  const dream = await dreamer.dream();
  assert.ok(dream.sampledCount >= 2, "should sample memories");
  assert.ok(dream.themes.length > 0, "should detect themes");

  // 6. Recall after compression — compressed content should be searchable
  const r4 = await recall.search({ query: "auth" });
  assert.ok(r4.memories.length >= 1, "auth should still be findable after compression");
});

await test("empty store operations", async () => {
  const store = freshStore();

  const recall = new RecallEngine(store);
  const r = await recall.search({ query: "anything" });
  assert.equal(r.memories.length, 0);

  const compressor = new Compressor(store);
  const results = await compressor.compressDue();
  assert.equal(results.length, 0);

  const dreamer = new DreamEngine(store);
  const dream = await dreamer.dream();
  assert.equal(dream.sampledCount, 0);
});

await test("crystal formation via repeated tags", async () => {
  const store = freshStore();
  const oldDate = new Date(Date.now() - 100 * 86400000).toISOString();

  // Create enough compressed memories to trigger crystallization
  for (let i = 0; i < 5; i++) {
    store.add(createMemory(`Meeting ${i} about project X`, {
      createdAt: new Date(Date.now() - (40 + i) * 86400000).toISOString(),
      tags: ["meeting", "projectX"],
      importance: 0.6,
    }));
  }

  // First compress RAW → COMPRESSED
  const comp = new Compressor(store);
  const r1 = await comp.compressDue();
  assert.ok(r1.length >= 1, "should compress to weekly");

  const stats = store.stats();
  assert.equal(stats.raw, 0, "all raw should be compressed");
  assert.ok(stats.compressed >= 1, "should have compressed");
});

await test("importance-based recall ranking", async () => {
  const store = freshStore();

  store.add(createMemory("Low importance deploy", {
    tags: ["deploy"], importance: 0.1,
  }));
  store.add(createMemory("High importance deploy", {
    tags: ["deploy"], importance: 0.95,
  }));
  store.add(createMemory("Medium importance deploy", {
    tags: ["deploy"], importance: 0.5,
  }));

  const recall = new RecallEngine(store);
  const r = await recall.search({ query: "deploy" });
  assert.equal(r.memories.length, 3);
  // Should be sorted by importance
  assert.ok(r.memories[0].importance >= r.memories[1].importance);
  assert.ok(r.memories[1].importance >= r.memories[2].importance);
});

// --- Summary ---
console.log(`\n${"─".repeat(40)}`);
console.log(`✅ ${passed} passed  ❌ ${failed} failed  📊 ${passed + failed} total\n`);
process.exit(failed > 0 ? 1 : 0);

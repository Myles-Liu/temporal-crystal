#!/usr/bin/env node
/**
 * CLI for Temporal Crystal Memory.
 *
 * Usage:
 *   tc init [path]
 *   tc add "content" [--importance 0.8] [--tags project,meeting]
 *   tc compress [--dry-run]
 *   tc stats
 *   tc list [layer]
 *   tc dream
 */

import { Command } from "commander";
import chalk from "chalk";
import { createMemory, createCrystal, MemoryLayer, defaultConfig, type Config } from "./models.js";
import { MemoryStore } from "./store.js";
import { Compressor } from "./compressor.js";
import { RecallEngine } from "./recall.js";
import { createProvider, type LLMConfig } from "./llm.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_PATH = "./tc-memory";

function loadStore(path?: string): MemoryStore {
  const storePath = path || DEFAULT_PATH;
  const configFile = join(storePath, "config.json");
  let config: Partial<Config> = {};
  if (existsSync(configFile)) {
    try {
      config = JSON.parse(readFileSync(configFile, "utf-8"));
    } catch {}
  }
  return new MemoryStore(storePath, config);
}

const program = new Command()
  .name("tc")
  .description("Temporal Crystal Memory — living memory for AI agents")
  .version("0.1.0");

program
  .command("init")
  .argument("[path]", "Memory store path", DEFAULT_PATH)
  .description("Initialize a new memory store")
  .action((path: string) => {
    if (existsSync(path)) {
      console.log(chalk.yellow(`⚠ Directory ${path} already exists`));
    }
    const store = loadStore(path);
    const config = defaultConfig();
    writeFileSync(join(path, "config.json"), JSON.stringify(config, null, 2));
    console.log(chalk.green(`✓ Initialized memory store at ${path}`));
    console.log(`  Layers: raw/ compressed/ abstract/ crystal/ crystals/ dreams/`);
  });

program
  .command("add")
  .argument("<content>", "Memory content")
  .option("-i, --importance <n>", "Importance score (0-1)", "0.5")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option("-p, --path <path>", "Memory store path")
  .description("Add a new memory")
  .action((content: string, opts: { importance: string; tags?: string; path?: string }) => {
    const store = loadStore(opts.path);
    const mem = createMemory(content, {
      importance: parseFloat(opts.importance),
      tags: opts.tags ? opts.tags.split(",").map((t) => t.trim()) : [],
    });
    store.add(mem);
    console.log(chalk.green(`✓ Added memory [${mem.id}]`));
    const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;
    console.log(`  Content: ${preview}`);
  });

program
  .command("compress")
  .option("--dry-run", "Show what would be compressed")
  .option("-p, --path <path>", "Memory store path")
  .description("Compress memories that are due for promotion")
  .option("--llm", "Use LLM for intelligent compression")
  .action(async (opts: { dryRun?: boolean; path?: string; llm?: boolean }) => {
    const store = loadStore(opts.path);
    const llm = opts.llm ? createProvider() : undefined;
    const compressor = new Compressor(store, store.config, llm);
    const results = await compressor.compressDue(opts.dryRun || false);

    if (results.length === 0) {
      console.log(chalk.dim("Nothing to compress — all memories are fresh."));
      return;
    }

    const prefix = opts.dryRun ? "[DRY RUN] " : "";
    for (const r of results) {
      if (r.action === "crystallize") {
        console.log(chalk.magenta(`${prefix}💎 Crystal: ${r.summaryPreview}`));
      } else {
        console.log(chalk.cyan(`${prefix}📦 ${r.fromLayer} → ${r.toLayer}: ${r.inputCount} memories → ${r.summaryPreview}`));
      }
    }
    const verb = opts.dryRun ? "would be " : "";
    console.log(chalk.green(`\n✓ ${results.length} compression${results.length > 1 ? "s" : ""} ${verb}applied`));
  });

program
  .command("stats")
  .option("-p, --path <path>", "Memory store path")
  .description("Show memory statistics")
  .action((opts: { path?: string }) => {
    const store = loadStore(opts.path);
    const s = store.stats();

    console.log(chalk.bold("\n💎 Temporal Crystal Memory Stats\n"));
    const icons: Record<string, string> = {
      raw: "🟢",
      compressed: "🔵",
      abstract: "🟣",
      crystal: "💎",
    };
    for (const layer of Object.values(MemoryLayer)) {
      const icon = icons[layer] || "  ";
      console.log(`  ${icon} ${layer.padEnd(12)} ${String(s[layer] || 0).padStart(5)}`);
    }
    console.log(`  💎 ${"crystals".padEnd(12)} ${String(s.crystals || 0).padStart(5)}`);
    console.log(chalk.bold(`\n  Total${" ".repeat(10)} ${String(s.total).padStart(5)}\n`));
  });

program
  .command("list")
  .argument("[layer]", "Memory layer", "raw")
  .option("-p, --path <path>", "Memory store path")
  .description("List memories in a layer")
  .action((layer: string, opts: { path?: string }) => {
    const store = loadStore(opts.path);
    let memLayer: MemoryLayer;
    try {
      memLayer = layer as MemoryLayer;
      if (!Object.values(MemoryLayer).includes(memLayer)) throw new Error();
    } catch {
      console.log(chalk.red(`Unknown layer: ${layer}. Use: raw, compressed, abstract, crystal`));
      return;
    }

    const memories = store.listLayer(memLayer);
    if (memories.length === 0) {
      console.log(chalk.dim(`No memories in ${layer} layer.`));
      return;
    }

    console.log(chalk.bold(`\nMemories in [${layer}]\n`));
    console.log(chalk.dim("  ID           Age    Imp   Content                                      Tags"));
    console.log(chalk.dim("  " + "─".repeat(85)));

    for (const mem of memories) {
      const age = `${Math.floor((Date.now() - new Date(mem.createdAt).getTime()) / 86400000)}d`;
      const content = mem.content.length > 45 ? mem.content.slice(0, 45) + "..." : mem.content;
      const tags = mem.tags.length ? mem.tags.join(",") : "-";
      console.log(`  ${mem.id}  ${age.padStart(4)}  ${mem.importance.toFixed(1).padStart(4)}   ${content.padEnd(48)} ${chalk.cyan(tags)}`);
    }
    console.log();
  });

program
  .command("dream")
  .option("-p, --path <path>", "Memory store path")
  .description("Run a dream cycle")
  .action((opts: { path?: string }) => {
    const store = loadStore(opts.path);
    const allMemories = [
      ...store.listLayer(MemoryLayer.RAW),
      ...store.listLayer(MemoryLayer.COMPRESSED),
      ...store.listLayer(MemoryLayer.ABSTRACT),
    ];

    if (allMemories.length < 3) {
      console.log(chalk.dim("Not enough memories to dream. Add more first."));
      return;
    }

    const sampleSize = Math.min(store.config.dreamSampleSize, allMemories.length);
    const shuffled = [...allMemories].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, sampleSize);

    console.log(chalk.blue("\n🌙 Dream Cycle — Sampled Memories\n"));
    for (const m of sample) {
      console.log(chalk.dim(`  [${m.layer}] `) + m.content.slice(0, 60));
    }

    const tagFreq = new Map<string, number>();
    for (const m of sample) {
      for (const t of m.tags) tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
    }

    if (tagFreq.size > 0) {
      console.log(chalk.magenta("\n💡 Detected themes:"));
      const sorted = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      for (const [tag, count] of sorted) {
        console.log(`   ${tag}: appeared ${count} times`);
      }
    }

    console.log(chalk.dim("\nNote: Full dream processing requires LLM integration (v0.4)\n"));
  });

program
  .command("recall")
  .argument("<query>", "Search query")
  .option("-t, --tags <tags>", "Filter by tags (comma-separated)")
  .option("-l, --layer <layer>", "Filter by layer")
  .option("-n, --limit <n>", "Max results", "5")
  .option("--from <date>", "From date (YYYY-MM-DD)")
  .option("--to <date>", "To date (YYYY-MM-DD)")
  .option("--llm", "Use LLM for semantic search")
  .option("-p, --path <path>", "Memory store path")
  .description("Search and recall memories")
  .action(async (query: string, opts: any) => {
    const store = loadStore(opts.path);
    const llm = opts.llm ? createProvider() : undefined;
    const engine = new RecallEngine(store, llm);

    const result = await engine.search({
      query,
      tags: opts.tags?.split(",").map((t: string) => t.trim()),
      layer: opts.layer as MemoryLayer | undefined,
      fromDate: opts.from,
      toDate: opts.to,
      limit: parseInt(opts.limit),
      useLLM: opts.llm,
    });

    console.log(chalk.bold(`\n🔍 Recall: "${query}"\n`));
    console.log(chalk.dim(`  Searched ${result.totalSearched} memories\n`));

    if (result.memories.length === 0 && result.crystals.length === 0) {
      console.log(chalk.dim("  No matching memories found.\n"));
      return;
    }

    if (result.memories.length > 0) {
      console.log(chalk.bold("  Memories:"));
      for (const mem of result.memories) {
        const age = `${Math.floor((Date.now() - new Date(mem.createdAt).getTime()) / 86400000)}d`;
        const layerIcon: Record<string, string> = { raw: "🟢", compressed: "🔵", abstract: "🟣", crystal: "💎" };
        const icon = layerIcon[mem.layer] || "  ";
        console.log(`  ${icon} [${mem.id}] ${age} ago  imp:${mem.importance.toFixed(1)}`);
        console.log(`     ${mem.content.slice(0, 120)}`);
        if (mem.tags.length) console.log(chalk.cyan(`     tags: ${mem.tags.join(", ")}`));
        console.log();
      }
    }

    if (result.crystals.length > 0) {
      console.log(chalk.magenta.bold("  💎 Crystals:"));
      for (const c of result.crystals) {
        console.log(chalk.magenta(`  💎 [${c.id}] ${c.insight.slice(0, 120)}`));
      }
      console.log();
    }
  });

program.parse();

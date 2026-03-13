/**
 * Memory compression engine.
 *
 * Handles compressing memories through layers:
 *   RAW → COMPRESSED → ABSTRACT → CRYSTAL
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type MemoryData,
  type Config,
  MemoryLayer,
  nextLayer,
  createMemory,
  createCrystal,
} from "./models.js";
import { MemoryStore } from "./store.js";
import { type LLMProvider, PROMPTS } from "./llm.js";

export interface CompressionResult {
  action: "compress" | "crystallize";
  fromLayer?: string;
  toLayer?: string;
  inputCount: number;
  summaryPreview: string;
  newId?: string;
}

export class Compressor {
  private llm?: LLMProvider;

  constructor(
    private store: MemoryStore,
    private config: Config = store.config,
    llm?: LLMProvider
  ) {
    this.llm = llm;
  }

  async compressDue(dryRun = false): Promise<CompressionResult[]> {
    const due = this.store.listDueForCompression();
    const results: CompressionResult[] = [];

    // Group by target layer
    const groups = new Map<MemoryLayer, MemoryData[]>();
    for (const mem of due) {
      const target = nextLayer(mem.layer);
      if (!target) continue;
      if (!groups.has(target)) groups.set(target, []);
      groups.get(target)!.push(mem);
    }

    for (const [targetLayer, memories] of groups) {
      if (targetLayer === MemoryLayer.COMPRESSED) {
        results.push(...await this.compressToWeekly(memories, dryRun));
      } else if (targetLayer === MemoryLayer.ABSTRACT) {
        results.push(...await this.compressToMonthly(memories, dryRun));
      } else if (targetLayer === MemoryLayer.CRYSTAL) {
        results.push(...await this.compressToCrystal(memories, dryRun));
      }
    }

    return results;
  }

  private async compressToWeekly(memories: MemoryData[], dryRun: boolean): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    // Group by week
    const weeks = new Map<string, MemoryData[]>();
    for (const mem of memories) {
      const d = new Date(mem.createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks.has(key)) weeks.set(key, []);
      weeks.get(key)!.push(mem);
    }

    for (const [week, mems] of weeks) {
      const summary = await this.summarize(mems, "weekly");
      const result: CompressionResult = {
        action: "compress",
        fromLayer: "raw",
        toLayer: "compressed",
        inputCount: mems.length,
        summaryPreview: summary.length > 100 ? summary.slice(0, 100) + "..." : summary,
      };

      if (!dryRun) {
        const allTags = [...new Set(mems.flatMap((m) => m.tags))];
        const maxImportance = Math.max(...mems.map((m) => m.importance));
        const compressed = createMemory(summary, {
          layer: MemoryLayer.COMPRESSED,
          createdAt: mems[0].createdAt,
          compressedAt: new Date().toISOString(),
          sourceIds: mems.map((m) => m.id),
          importance: maxImportance,
          tags: allTags,
        });

        // Write directly to compressed layer (bypass add which forces RAW)
        compressed.layer = MemoryLayer.COMPRESSED;
        writeFileSync(
          join(this.store.path, "compressed", `${compressed.id}.json`),
          JSON.stringify(compressed, null, 2)
        );

        // Remove old
        for (const m of mems) this.store.delete(m.id);
        result.newId = compressed.id;
      }

      results.push(result);
    }

    return results;
  }

  private async compressToMonthly(memories: MemoryData[], dryRun: boolean): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    const months = new Map<string, MemoryData[]>();

    for (const mem of memories) {
      const key = mem.createdAt.slice(0, 7); // YYYY-MM
      if (!months.has(key)) months.set(key, []);
      months.get(key)!.push(mem);
    }

    for (const [month, mems] of months) {
      const summary = await this.summarize(mems, "monthly");
      const result: CompressionResult = {
        action: "compress",
        fromLayer: "compressed",
        toLayer: "abstract",
        inputCount: mems.length,
        summaryPreview: summary.length > 100 ? summary.slice(0, 100) + "..." : summary,
      };

      if (!dryRun) {
        for (const m of mems) this.store.delete(m.id);
      }

      results.push(result);
    }

    return results;
  }

  private async compressToCrystal(memories: MemoryData[], dryRun: boolean): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];

    if (memories.length < this.config.crystalThreshold) return results;

    // Find recurring tags
    const tagCounts = new Map<string, number>();
    for (const m of memories) {
      for (const tag of m.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    for (const [tag, count] of tagCounts) {
      if (count < this.config.crystalThreshold) continue;

      const related = memories.filter((m) => m.tags.includes(tag));
      let insight = `Pattern [${tag}]: Recurring across ${related.length} memories`;

      // Use LLM for richer insight if available
      if (this.llm) {
        try {
          const memText = related.map((m) => `- ${m.content}`).join("\n");
          insight = await this.llm.complete(PROMPTS.crystallize(memText, tag));
        } catch { /* fallback to rule-based */ }
      }

      const result: CompressionResult = {
        action: "crystallize",
        inputCount: related.length,
        summaryPreview: insight.slice(0, 100),
      };

      if (!dryRun) {
        const crystal = createCrystal(insight, {
          evidence: related.map((m) => m.id),
          confidence: Math.min(1.0, related.length / 10),
          category: tag,
          tags: [tag],
        });
        this.store.addCrystal(crystal);
        result.newId = crystal.id;
      }

      results.push(result);
    }

    return results;
  }

  // --- Summarization with LLM fallback ---

  private async summarize(memories: MemoryData[], level: string): Promise<string> {
    if (this.llm) {
      try {
        const memText = memories.map((m) => `- ${m.content}`).join("\n");
        if (level === "weekly") {
          return await this.llm.complete(PROMPTS.compressWeekly(memText));
        } else if (level === "monthly") {
          return await this.llm.complete(PROMPTS.compressMonthly(memText));
        }
      } catch {
        // Fall through to simple
      }
    }
    return this.simpleSummarize(memories, level);
  }

  // --- Simple compression (no LLM) ---

  private simpleSummarize(memories: MemoryData[], level: string): string {
    if (memories.length === 0) return "";

    if (level === "weekly") {
      const sentences: string[] = [];
      for (const m of memories) {
        const first = m.content.split(".")[0].trim();
        if (first && !sentences.includes(first)) sentences.push(first);
      }
      const from = memories[0].createdAt.slice(0, 10);
      const to = memories[memories.length - 1].createdAt.slice(0, 10);
      return `[Week ${from} to ${to}] ${sentences.join(". ")}.`;
    }

    if (level === "monthly") {
      const combined = memories.map((m) => m.content).join(" ");
      const words = combined.match(/\b[a-zA-Z]{4,}\b/g) || [];
      const freq = new Map<string, number>();
      for (const w of words) {
        const lw = w.toLowerCase();
        freq.set(lw, (freq.get(lw) || 0) + 1);
      }
      const top = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([w]) => w);
      const month = memories[0].createdAt.slice(0, 7);
      return `[Month ${month}] Key themes: ${top.join(", ")}. ${memories.length} events consolidated.`;
    }

    return memories.map((m) => m.content.slice(0, 50)).join(" | ");
  }
}

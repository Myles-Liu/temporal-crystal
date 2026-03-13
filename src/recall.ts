/**
 * Memory recall / search engine.
 *
 * Supports:
 * 1. Keyword search (no LLM needed)
 * 2. Tag-based filtering
 * 3. Time-range filtering
 * 4. LLM-powered semantic search (optional)
 */

import { type MemoryData, type CrystalData, MemoryLayer } from "./models.js";
import { MemoryStore } from "./store.js";
import { type LLMProvider, PROMPTS } from "./llm.js";

export interface RecallOptions {
  query?: string;
  tags?: string[];
  layer?: MemoryLayer;
  fromDate?: string; // ISO date
  toDate?: string;
  limit?: number;
  useLLM?: boolean;
}

export interface RecallResult {
  memories: MemoryData[];
  crystals: CrystalData[];
  totalSearched: number;
}

export class RecallEngine {
  constructor(
    private store: MemoryStore,
    private llm?: LLMProvider
  ) {}

  async search(options: RecallOptions): Promise<RecallResult> {
    const limit = options.limit || 10;

    // Gather all memories from specified layer or all layers
    let memories: MemoryData[] = [];
    if (options.layer) {
      memories = this.store.listLayer(options.layer);
    } else {
      for (const layer of Object.values(MemoryLayer)) {
        memories.push(...this.store.listLayer(layer));
      }
    }

    const totalSearched = memories.length;

    // Filter by date range
    if (options.fromDate) {
      const from = new Date(options.fromDate).getTime();
      memories = memories.filter((m) => new Date(m.createdAt).getTime() >= from);
    }
    if (options.toDate) {
      const to = new Date(options.toDate).getTime();
      memories = memories.filter((m) => new Date(m.createdAt).getTime() <= to);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      memories = memories.filter((m) =>
        options.tags!.some((t) => m.tags.includes(t))
      );
    }

    // Keyword search
    if (options.query) {
      const q = options.query.toLowerCase();
      const keywords = q.split(/\s+/).filter(Boolean);

      if (options.useLLM && this.llm) {
        // LLM-powered semantic search
        memories = await this.llmSearch(memories, options.query, limit);
      } else {
        // Simple keyword scoring
        const scored = memories.map((m) => {
          const text = m.content.toLowerCase();
          let score = 0;
          for (const kw of keywords) {
            if (text.includes(kw)) score += 1;
          }
          // Boost by importance
          score *= 1 + m.importance;
          return { memory: m, score };
        });

        memories = scored
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((s) => s.memory);
      }
    }

    // Sort by importance + recency
    memories = memories
      .sort((a, b) => {
        const importanceDiff = b.importance - a.importance;
        if (Math.abs(importanceDiff) > 0.1) return importanceDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);

    // Also search crystals
    let crystals = this.store.listCrystals();
    if (options.query) {
      const q = options.query.toLowerCase();
      crystals = crystals.filter(
        (c) =>
          c.insight.toLowerCase().includes(q) ||
          c.tags.some((t) => t.includes(q))
      );
    }
    if (options.tags) {
      crystals = crystals.filter((c) =>
        options.tags!.some((t) => c.tags.includes(t))
      );
    }

    return { memories, crystals: crystals.slice(0, 5), totalSearched };
  }

  private async llmSearch(
    memories: MemoryData[],
    query: string,
    limit: number
  ): Promise<MemoryData[]> {
    if (!this.llm || memories.length === 0) return memories.slice(0, limit);

    // Build a condensed list for the LLM
    const memList = memories
      .slice(0, 50) // cap at 50 to keep prompt reasonable
      .map((m) => `[${m.id}] ${m.content.slice(0, 100)}`)
      .join("\n");

    try {
      const response = await this.llm.complete(PROMPTS.recall(query, memList));
      const ids: string[] = JSON.parse(response);
      const idSet = new Set(ids.slice(0, limit));
      const matched = memories.filter((m) => idSet.has(m.id));
      // Preserve LLM's ranking order
      return ids
        .map((id) => matched.find((m) => m.id === id))
        .filter((m): m is MemoryData => m !== undefined);
    } catch {
      // Fallback to keyword search
      return memories.slice(0, limit);
    }
  }
}

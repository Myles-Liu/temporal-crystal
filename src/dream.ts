/**
 * Dream Engine — cross-temporal pattern discovery.
 *
 * Samples random memories across layers and time,
 * finds unexpected connections via tag co-occurrence
 * or LLM creative association.
 */

import { type MemoryData, MemoryLayer, createCrystal } from "./models.js";
import { MemoryStore } from "./store.js";
import { type LLMProvider, PROMPTS } from "./llm.js";

export interface DreamResult {
  sampledCount: number;
  themes: Array<{ tag: string; count: number }>;
  connections: string[];
  crystalsFormed: string[];
}

export class DreamEngine {
  constructor(
    private store: MemoryStore,
    private llm?: LLMProvider
  ) {}

  async dream(): Promise<DreamResult> {
    const all = [
      ...this.store.listLayer(MemoryLayer.RAW),
      ...this.store.listLayer(MemoryLayer.COMPRESSED),
      ...this.store.listLayer(MemoryLayer.ABSTRACT),
    ];

    const size = Math.min(this.store.config.dreamSampleSize, all.length);
    const sample = this.sample(all, size);
    const themes = this.detectThemes(sample);
    const connections: string[] = [];
    const crystalsFormed: string[] = [];

    // LLM creative association
    if (this.llm && sample.length >= 2) {
      const memText = sample.map(m => `- [${m.layer}] ${m.content}`).join("\n");
      try {
        const insight = await this.llm.complete(PROMPTS.dream(memText));
        if (insight) connections.push(insight);
      } catch { /* non-critical */ }
    }

    // Auto-crystallize strong themes
    for (const t of themes) {
      if (t.count >= this.store.config.crystalThreshold) {
        const related = sample.filter(m => m.tags.includes(t.tag));
        let insight = `Dream pattern [${t.tag}]: ${t.count} occurrences`;
        if (this.llm) {
          try {
            const memText = related.map(m => `- ${m.content}`).join("\n");
            insight = await this.llm.complete(
              PROMPTS.crystallize(memText, t.tag)
            );
          } catch { /* fallback */ }
        }
        const crystal = createCrystal(insight, {
          evidence: related.map(m => m.id),
          confidence: Math.min(1, t.count / 10),
          category: "dream",
          tags: [t.tag, "dream"],
        });
        this.store.addCrystal(crystal);
        crystalsFormed.push(crystal.id);
      }
    }

    return {
      sampledCount: sample.length,
      themes,
      connections,
      crystalsFormed,
    };
  }

  private sample(memories: MemoryData[], n: number): MemoryData[] {
    const shuffled = [...memories].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  private detectThemes(memories: MemoryData[]) {
    const freq = new Map<string, number>();
    for (const m of memories) {
      for (const t of m.tags) freq.set(t, (freq.get(t) || 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }
}

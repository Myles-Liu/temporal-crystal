/**
 * Core data models for Temporal Crystal Memory.
 *
 * Memory flows through layers:
 *   RAW → COMPRESSED → ABSTRACT → CRYSTAL
 *
 * Each transition preserves semantic meaning while reducing detail.
 */

import { z } from "zod";

export enum MemoryLayer {
  RAW = "raw",
  COMPRESSED = "compressed",
  ABSTRACT = "abstract",
  CRYSTAL = "crystal",
}

const LAYER_ORDER = [
  MemoryLayer.RAW,
  MemoryLayer.COMPRESSED,
  MemoryLayer.ABSTRACT,
  MemoryLayer.CRYSTAL,
];

const COMPRESSION_THRESHOLDS: Record<MemoryLayer, number> = {
  [MemoryLayer.RAW]: 7,
  [MemoryLayer.COMPRESSED]: 30,
  [MemoryLayer.ABSTRACT]: 90,
  [MemoryLayer.CRYSTAL]: Infinity,
};

// --- Schemas ---

export const MemorySchema = z.object({
  id: z.string(),
  content: z.string(),
  layer: z.nativeEnum(MemoryLayer).default(MemoryLayer.RAW),
  createdAt: z.string().datetime(),
  compressedAt: z.string().datetime().nullable().default(null),
  sourceIds: z.array(z.string()).default([]),
  importance: z.number().min(0).max(1).default(0.5),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type MemoryData = z.infer<typeof MemorySchema>;

export const CrystalSchema = z.object({
  id: z.string(),
  insight: z.string(),
  evidence: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  formedAt: z.string().datetime(),
  category: z.string().default("general"),
  tags: z.array(z.string()).default([]),
});

export type CrystalData = z.infer<typeof CrystalSchema>;

export const ConfigSchema = z.object({
  storePath: z.string().default("./tc-memory"),
  rawRetentionDays: z.number().default(7),
  compressedRetentionDays: z.number().default(30),
  abstractRetentionDays: z.number().default(90),
  crystalThreshold: z.number().default(3),
  dreamSampleSize: z.number().default(20),
  importanceThreshold: z.number().default(0.3),
});

export type Config = z.infer<typeof ConfigSchema>;

// --- Helper functions ---

let _idCounter = 0;
export function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${ts}${rand}`.slice(0, 12);
}

export function ageDays(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - created) / (1000 * 60 * 60 * 24);
}

export function shouldCompress(memory: MemoryData): boolean {
  const threshold = COMPRESSION_THRESHOLDS[memory.layer];
  return ageDays(memory.createdAt) >= threshold;
}

export function nextLayer(layer: MemoryLayer): MemoryLayer | null {
  const idx = LAYER_ORDER.indexOf(layer);
  return idx < LAYER_ORDER.length - 1 ? LAYER_ORDER[idx + 1] : null;
}

export function crystalStrength(crystal: CrystalData): number {
  return Math.min(1.0, crystal.evidence.length / 10) * crystal.confidence;
}

export function createMemory(
  content: string,
  opts: Partial<Omit<MemoryData, "id" | "content">> = {}
): MemoryData {
  return MemorySchema.parse({
    id: generateId(),
    content,
    layer: MemoryLayer.RAW,
    createdAt: new Date().toISOString(),
    compressedAt: null,
    sourceIds: [],
    importance: 0.5,
    tags: [],
    metadata: {},
    ...opts,
  });
}

export function createCrystal(
  insight: string,
  opts: Partial<Omit<CrystalData, "id" | "insight">> = {}
): CrystalData {
  return CrystalSchema.parse({
    id: generateId(),
    insight,
    formedAt: new Date().toISOString(),
    evidence: [],
    confidence: 0.5,
    category: "general",
    tags: [],
    ...opts,
  });
}

export function defaultConfig(): Config {
  return ConfigSchema.parse({});
}

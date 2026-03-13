/**
 * File-based memory store with layer management.
 *
 * Directory structure:
 *   tc-memory/
 *     raw/          # daily memories
 *     compressed/   # weekly summaries
 *     abstract/     # monthly patterns
 *     crystal/      # permanent knowledge (layer)
 *     crystals/     # crystal insights
 *     dreams/       # dream cycle outputs
 *     index.json    # memory index
 *     config.json   # store config
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  type MemoryData,
  type CrystalData,
  type Config,
  MemoryLayer,
  MemorySchema,
  CrystalSchema,
  ConfigSchema,
  shouldCompress,
  defaultConfig,
} from "./models.js";

export class MemoryStore {
  readonly path: string;
  readonly config: Config;
  private index: Record<string, string> = {}; // id → layer

  constructor(path: string, config?: Partial<Config>) {
    this.path = path;
    this.config = config ? ConfigSchema.parse({ storePath: path, ...config }) : { ...defaultConfig(), storePath: path };
    this.ensureDirs();
    this.loadIndex();
  }

  // --- Directory management ---

  private ensureDirs(): void {
    for (const layer of Object.values(MemoryLayer)) {
      mkdirSync(join(this.path, layer), { recursive: true });
    }
    mkdirSync(join(this.path, "crystals"), { recursive: true });
    mkdirSync(join(this.path, "dreams"), { recursive: true });
  }

  private indexPath(): string {
    return join(this.path, "index.json");
  }

  private loadIndex(): void {
    const p = this.indexPath();
    if (existsSync(p)) {
      try {
        this.index = JSON.parse(readFileSync(p, "utf-8"));
      } catch {
        this.rebuildIndex();
      }
    } else {
      this.rebuildIndex();
    }
  }

  private saveIndex(): void {
    writeFileSync(this.indexPath(), JSON.stringify(this.index, null, 2));
  }

  private rebuildIndex(): void {
    this.index = {};
    for (const layer of Object.values(MemoryLayer)) {
      const dir = join(this.path, layer);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
        try {
          const data = JSON.parse(readFileSync(join(dir, file), "utf-8"));
          if (data.id) this.index[data.id] = layer;
        } catch {
          continue;
        }
      }
    }
    this.saveIndex();
  }

  private memoryPath(id: string, layer: string): string {
    return join(this.path, layer, `${id}.json`);
  }

  // --- CRUD ---

  add(memory: MemoryData): MemoryData {
    memory.layer = MemoryLayer.RAW;
    const p = this.memoryPath(memory.id, memory.layer);
    writeFileSync(p, JSON.stringify(memory, null, 2));
    this.index[memory.id] = memory.layer;
    this.saveIndex();
    return memory;
  }

  get(id: string): MemoryData | null {
    const layer = this.index[id];
    if (!layer) return null;
    const p = this.memoryPath(id, layer);
    if (!existsSync(p)) return null;
    try {
      return MemorySchema.parse(JSON.parse(readFileSync(p, "utf-8")));
    } catch {
      return null;
    }
  }

  listLayer(layer: MemoryLayer): MemoryData[] {
    const dir = join(this.path, layer);
    if (!existsSync(dir)) return [];
    const memories: MemoryData[] = [];
    let indexChanged = false;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      try {
        const mem = MemorySchema.parse(JSON.parse(readFileSync(join(dir, file), "utf-8")));
        memories.push(mem);
        // Sync index if file exists but not in index
        if (!this.index[mem.id]) {
          this.index[mem.id] = layer;
          indexChanged = true;
        }
      } catch {
        continue;
      }
    }
    if (indexChanged) this.saveIndex();
    return memories;
  }

  listDueForCompression(): MemoryData[] {
    const due: MemoryData[] = [];
    const layers = [MemoryLayer.RAW, MemoryLayer.COMPRESSED, MemoryLayer.ABSTRACT];
    for (const layer of layers) {
      for (const mem of this.listLayer(layer)) {
        if (shouldCompress(mem)) {
          due.push(mem);
        }
      }
    }
    return due;
  }

  promote(memory: MemoryData, newContent: string, targetLayer: MemoryLayer): MemoryData {
    // Remove old file
    const oldPath = this.memoryPath(memory.id, memory.layer);
    if (existsSync(oldPath)) unlinkSync(oldPath);

    // Update
    memory.content = newContent;
    memory.layer = targetLayer;
    memory.compressedAt = new Date().toISOString();

    // Write new
    const newPath = this.memoryPath(memory.id, targetLayer);
    writeFileSync(newPath, JSON.stringify(memory, null, 2));
    this.index[memory.id] = targetLayer;
    this.saveIndex();
    return memory;
  }

  delete(id: string): boolean {
    const layer = this.index[id];
    if (!layer) return false;
    const p = this.memoryPath(id, layer);
    if (existsSync(p)) unlinkSync(p);
    delete this.index[id];
    this.saveIndex();
    return true;
  }

  // --- Crystals ---

  addCrystal(crystal: CrystalData): CrystalData {
    const p = join(this.path, "crystals", `${crystal.id}.json`);
    writeFileSync(p, JSON.stringify(crystal, null, 2));
    return crystal;
  }

  listCrystals(): CrystalData[] {
    const dir = join(this.path, "crystals");
    if (!existsSync(dir)) return [];
    const crystals: CrystalData[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
      try {
        crystals.push(CrystalSchema.parse(JSON.parse(readFileSync(join(dir, file), "utf-8"))));
      } catch {
        continue;
      }
    }
    return crystals;
  }

  // --- Stats ---

  stats(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const layer of Object.values(MemoryLayer)) {
      const dir = join(this.path, layer);
      result[layer] = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).length : 0;
    }
    const crystalDir = join(this.path, "crystals");
    result.crystals = existsSync(crystalDir) ? readdirSync(crystalDir).filter((f) => f.endsWith(".json")).length : 0;
    result.total = Object.values(result).reduce((a, b) => a + b, 0);
    return result;
  }
}

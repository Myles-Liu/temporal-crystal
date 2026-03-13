/**
 * Temporal Crystal Memory
 *
 * Living memory for AI agents — memories that evolve,
 * compress, and crystallize over time.
 */

export {
  MemoryLayer,
  MemorySchema,
  CrystalSchema,
  ConfigSchema,
  type MemoryData,
  type CrystalData,
  type Config,
  createMemory,
  createCrystal,
  defaultConfig,
  generateId,
  ageDays,
  shouldCompress,
  nextLayer,
  crystalStrength,
} from "./models.js";

export { MemoryStore } from "./store.js";
export { Compressor, type CompressionResult } from "./compressor.js";

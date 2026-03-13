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
export {
  type LLMProvider,
  type LLMConfig,
  type LLMOptions,
  OpenAIProvider,
  NoopProvider,
  createProvider,
  PROMPTS,
} from "./llm.js";
export { RecallEngine, type RecallOptions, type RecallResult } from "./recall.js";
export { DreamEngine, type DreamResult } from "./dream.js";

# ⏱️ Temporal Crystal Memory

> Living memory for AI agents — memories that evolve, compress, and crystallize over time.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## The Problem

AI agents today have flat, static memory:
- Daily logs grow forever
- Context windows overflow
- Old memories never compress
- No distinction between "what happened" and "what matters"

**Temporal Crystal** implements **living memory** that evolves through time layers:

```
Day 1:   "Met with Zhang San at 3pm to discuss ABC project budget"
Day 7:   "ABC project kickoff meeting with Zhang San"
Day 30:  "ABC project started"
Day 365: 💎 "Led enterprise project initiatives"
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Memory Layers                         │
├─────────────────────────────────────────────────────────┤
│  🟢 RAW (0-7 days)     │ Full detail, daily logs        │
│  🔵 COMPRESSED (7-30d) │ Weekly summaries, key events   │
│  🟣 ABSTRACT (30-90d)  │ Monthly patterns, learnings    │
│  💎 CRYSTAL (90d+)     │ Permanent knowledge, principles│
├─────────────────────────────────────────────────────────┤
│  🌙 Dream Engine  — Cross-temporal pattern detection     │
│  🔍 Recall Engine — Keyword, tag & semantic search       │
│  🧠 LLM Compression — Intelligent summarization         │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/Myles-Liu/temporal-crystal.git
cd temporal-crystal
npm install

# Initialize a memory store
npx tc init ./my-memory

# Add memories
npx tc add "Deployed v2.3 to production" --tags deploy,frontend --importance 0.9
npx tc add "Learned that Node 14 is required for legacy webpack" --tags lesson

# View stats
npx tc stats

# Search memories
npx tc recall "webpack"
npx tc recall "deploy" --tags frontend --limit 3

# Compress old memories (auto-detects age > 7 days)
npx tc compress

# With LLM-powered compression (requires OPENAI_API_KEY)
npx tc compress --llm

# Run a dream cycle
npx tc dream
```

## Programmatic Usage

```typescript
import { MemoryStore, Compressor, RecallEngine, createMemory, createProvider } from "temporal-crystal";

// Initialize
const store = new MemoryStore("./my-memory");

// Add memories
store.add(createMemory("Deployed v2.3 to production", {
  tags: ["deploy", "frontend"],
  importance: 0.9,
}));

// Search
const recall = new RecallEngine(store);
const results = await recall.search({ query: "deploy", limit: 5 });

// Compress with LLM (optional)
const llm = createProvider({ provider: "openai", apiKey: process.env.OPENAI_API_KEY });
const compressor = new Compressor(store, store.config, llm);
await compressor.compressDue();

// Or compress without LLM (rule-based fallback)
const simpleCompressor = new Compressor(store);
await simpleCompressor.compressDue();
```

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| 🟢 Time-Decay Compression | ✅ v0.1 | Auto-compress memories based on age |
| 💎 Pattern Crystallization | ✅ v0.1 | Repeated patterns → permanent crystals |
| 🌙 Dream Processing | ✅ v0.1 | Random sampling + theme detection |
| 🧠 LLM Compression | ✅ v0.2 | OpenAI-compatible intelligent summarization |
| 🔍 Recall Engine | ✅ v0.2 | Keyword, tag, date-range & semantic search |
| 📊 Memory Metrics | ✅ v0.1 | Stats, compression ratio, layer counts |
| 🌐 Embedding Search | 🔜 v0.3 | Vector-based semantic recall |
| 🎨 Visualization UI | 🔜 v0.4 | Memory timeline & crystal graph |

## Configuration

`tc init` creates a `config.json` with sensible defaults:

```json
{
  "compressAfterDays": 7,
  "abstractAfterDays": 30,
  "crystalThreshold": 3,
  "dreamSampleSize": 5,
  "maxRawMemories": 1000
}
```

## Philosophy

> "Memory is not a recording. It's a living thing that grows, changes, and sometimes dreams."

Inspired by human memory consolidation, Ebbinghaus forgetting curve, and Schmidhuber's compression-as-intelligence theory.

## License

MIT

---

Built with 💎 by humans and agents

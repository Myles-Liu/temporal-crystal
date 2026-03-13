# ⏱️ Temporal Crystal Memory

> Living memory for AI agents — memories that evolve, compress, and crystallize over time.

## The Problem

AI agents today have flat, static memory:
- `memory/2026-03-13.md` grows forever
- Context windows overflow
- Old memories never compress
- No distinction between "what happened" and "what matters"

Humans don't remember like this. We:
- Forget irrelevant details
- Compress experiences into patterns
- Crystallize repeated insights into knowledge
- Dream to consolidate memories

## The Solution

Temporal Crystal implements **living memory** that evolves through time:

```
Day 1:   "Met with Zhang San at 3pm to discuss ABC project budget"
Day 7:   "ABC project kickoff meeting with Zhang San"  
Day 30:  "ABC project started"
Day 365: Pattern: "Led enterprise project initiatives"
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Memory Layers                         │
├─────────────────────────────────────────────────────────┤
│  RAW (0-7 days)     │ Full detail, daily logs           │
│  COMPRESSED (7-30d) │ Weekly summaries, key events      │
│  ABSTRACT (30-90d)  │ Monthly patterns, learnings       │
│  CRYSTAL (90d+)     │ Permanent knowledge, principles   │
├─────────────────────────────────────────────────────────┤
│                    Dream Engine                          │
│  - Random memory sampling                                │
│  - Cross-temporal pattern detection                      │
│  - Insight extraction                                    │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 1. 🌅 Time-Decay Compression
Memories automatically compress based on age and importance scoring.

### 2. 💎 Pattern Crystallization  
Repeated patterns (3+ occurrences) get promoted to permanent crystals.

### 3. 🌙 Dream Processing
Periodic "sleep" cycles that:
- Randomly sample memories across time
- Detect hidden patterns
- Generate insights

### 4. 🔍 Temporal Search
Query memories with time-awareness:
```python
recall("ABC project", when="last month")
recall("meetings with Zhang San", period="Q1 2026")
```

### 5. 📊 Memory Metrics
- Compression ratio
- Recall accuracy
- Crystal formation rate
- Memory health score

## Quick Start

```bash
pip install temporal-crystal

# Initialize memory system
tc init ./my-agent-memory

# Process daily memories
tc compress --age 7d

# Run dream cycle
tc dream

# Query with temporal awareness
tc recall "project meetings" --since "2 weeks ago"
```

## Use Cases

- **Personal AI Assistants**: Remember user preferences without context bloat
- **Coding Agents**: Compress project history, retain key decisions
- **Research Agents**: Crystallize findings across long investigations
- **Multi-Agent Systems**: Shared temporal memory layer

## Roadmap

- [ ] v0.1: Basic compression pipeline
- [ ] v0.2: Crystal formation engine
- [ ] v0.3: Dream processing
- [ ] v0.4: Temporal search
- [ ] v0.5: Visualization UI
- [ ] v1.0: Production ready

## Philosophy

> "Memory is not a recording. It's a living thing that grows, changes, and sometimes dreams."

Inspired by:
- Human memory consolidation during sleep
- Ebbinghaus forgetting curve
- Memory palace techniques
- Schmidhuber's compression as intelligence

## License

MIT

---

Built with 💎 by humans and agents

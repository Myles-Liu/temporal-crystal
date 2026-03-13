# Temporal Crystal - Roadmap

## Phase 1: Foundation (v0.1) 🎯 Current

### Goals
- Basic project structure
- Memory layer definitions
- Simple compression pipeline

### Deliverables
- [ ] Core data models (Memory, Layer, Crystal)
- [ ] File-based storage backend
- [ ] Daily → Weekly compression
- [ ] CLI: `tc init`, `tc compress`
- [ ] Unit tests

### Tech Stack
- Python 3.11+
- Pydantic for models
- Click for CLI
- pytest

---

## Phase 2: Compression Engine (v0.2)

### Goals
- Smart compression with LLM
- Importance scoring
- Multiple compression strategies

### Deliverables
- [ ] LLM-based summarization
- [ ] Importance scoring algorithm
- [ ] Weekly → Monthly compression
- [ ] Configurable compression rules
- [ ] Embedding-based deduplication

---

## Phase 3: Crystal Formation (v0.3)

### Goals
- Pattern detection
- Knowledge crystallization
- Permanent memory layer

### Deliverables
- [ ] Pattern detection (3+ occurrences)
- [ ] Crystal promotion logic
- [ ] Cross-reference linking
- [ ] Crystal validation (prevent garbage)
- [ ] Crystal index for fast lookup

---

## Phase 4: Dream Engine (v0.4)

### Goals
- Simulate memory consolidation
- Generate insights from random sampling
- Discover hidden connections

### Deliverables
- [ ] Random memory sampling
- [ ] Cross-temporal association
- [ ] Insight extraction prompt
- [ ] Dream journal output
- [ ] Scheduled dream cycles (cron integration)

---

## Phase 5: Temporal Search (v0.5)

### Goals
- Time-aware memory retrieval
- Natural language queries
- Relevance ranking with temporal decay

### Deliverables
- [ ] Temporal query parser
- [ ] Time-weighted retrieval
- [ ] Semantic search with embeddings
- [ ] CLI: `tc recall "query" --since "2 weeks ago"`
- [ ] API for integration

---

## Phase 6: Visualization (v0.6)

### Goals
- See your memory evolve
- Debug compression quality
- Beautiful timeline UI

### Deliverables
- [ ] Memory timeline view
- [ ] Layer transition visualization
- [ ] Crystal network graph
- [ ] Memory health dashboard
- [ ] Export to static HTML

---

## Phase 7: Production Ready (v1.0)

### Goals
- Battle-tested reliability
- OpenClaw integration
- Public release

### Deliverables
- [ ] OpenClaw skill integration
- [ ] Performance optimization
- [ ] Comprehensive docs
- [ ] GitHub Actions CI/CD
- [ ] PyPI package
- [ ] Demo video

---

## Future Ideas (Post v1.0)

- **Memory Sharing**: Export/import crystals between agents
- **Collaborative Memory**: Multiple agents contributing to shared crystals
- **Memory Versioning**: Git-like history of memory evolution
- **Forgetting Strategies**: Configurable decay curves
- **Memory Transplant**: Bootstrap new agent with existing crystals

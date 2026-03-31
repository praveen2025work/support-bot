# LLM Integration Plan for MITR AI

## Current State (No LLM)

- NLP is self-hosted via `@nlpjs/nlp` + fuzzy matching
- Intent classification, entity extraction, and response generation all run locally
- Zero external API calls for intelligence

## Architecture Change

```
Current:
  User Message -> NLP.js -> Intent -> Handler -> Response

With LLM:
  User Message -> NLP.js (fast check)
                   |-- High confidence -> Handler -> Response (no LLM cost)
                   +-- Low confidence -> LLM Gateway
                                          |-- Intent + Entities -> Handler -> Response
                                          |-- Query Builder -> Execute -> Summarize
                                          +-- RAG -> Knowledge Answer
```

## Work Items

### 1. LLM Gateway Service (New) — ~2-3 days | P0

Create `services/engine/src/core/llm/llm-gateway.ts`

- Abstract interface so you can swap providers (Claude, GPT, local models)
- API key management via env vars
- Rate limiting, retry logic, token budget tracking
- Streaming support for real-time responses

### 2. Hybrid Intent Router (Modify) — ~1-2 days | P0

Modify `services/engine/src/core/nlp/nlp-service.ts`

- Keep NLP.js as the fast/cheap first pass
- If confidence < threshold, fall back to LLM for intent classification
- LLM handles ambiguous/complex queries that NLP.js can't classify

### 3. Natural Language Query Builder (New) — ~3-5 days | P0

The biggest value-add:

- User asks "show me revenue by region for last quarter where amount > 10k"
- LLM translates to: query name + filters + group-by + sort
- Currently users must know exact query names and filter syntax
- LLM bridges the gap between natural language and the query engine

### 4. Conversational Follow-ups (Modify) — ~2-3 days | P1

Modify `services/engine/src/core/response/handlers/`

- Currently follow-ups are pattern-matched ("filter by X", "sort by Y")
- LLM enables free-form: "now show me just the top 5", "compare that with last year"
- Pass conversation history + current result context to LLM

### 5. Smart Summarization (New) — ~1-2 days | P2

- LLM generates natural language summaries of query results
- "Revenue is up 12% vs last month, driven by East region. 3 products declined."
- Currently results are just raw tables/charts

### 6. RAG Pipeline for Knowledge Base (New) — ~3-5 days | P1

Modify `services/engine/src/core/document-index/`

- Currently: keyword search (TF-IDF/BM25) returns document sections
- With LLM: retrieve relevant chunks, feed to LLM, get synthesized answer
- Add embedding-based retrieval (vector search) for better recall

### 7. Enhanced Features (Already LLM-Ready) — ~1 day each | P2

| Feature              | Current                 | With LLM                                               |
| -------------------- | ----------------------- | ------------------------------------------------------ |
| **Catalog Search**   | Fuse.js fuzzy match     | "show me anything related to monthly revenue"          |
| **Watch Rules**      | Form-based rule builder | "alert me if anything unusual happens with inventory"  |
| **Query Chains**     | Manual save from chat   | "create a workflow that checks sales by region weekly" |
| **Morning Briefing** | Template strings        | Natural language narrative summarizing insights        |
| **Knowledge Search** | TF-IDF + BM25           | RAG: retrieve docs + LLM generates contextual answers  |

## Effort Summary

| Work Item                      | Effort     | Priority                               |
| ------------------------------ | ---------- | -------------------------------------- |
| LLM Gateway Service            | 2-3 days   | P0 - foundation                        |
| Natural Language Query Builder | 3-5 days   | P0 - highest user value                |
| Hybrid Intent Router           | 1-2 days   | P0 - connects LLM to existing pipeline |
| RAG for Knowledge Base         | 3-5 days   | P1 - big upgrade for doc search        |
| Conversational Follow-ups      | 2-3 days   | P1 - smoother UX                       |
| Smart Summarization            | 1-2 days   | P2 - nice-to-have                      |
| Enhanced Features (6 items)    | 1 day each | P2 - incremental                       |

**Total: ~3-4 weeks** for a full LLM integration with the hybrid approach.

**Minimum viable LLM integration (1 week):** Gateway + Hybrid Router + Query Builder. This alone transforms the UX — users stop needing to know query names and filter syntax.

## Key Decision: LLM Provider

- **Claude API** — best reasoning, tool use native, higher cost
- **OpenAI GPT-4o** — good balance, widely supported
- **Local model (Ollama/vLLM)** — zero cost, self-hosted, lower capability
- **Hybrid** — local for simple tasks, cloud LLM for complex (recommended)

## Why the Codebase is Ready

The existing architecture is designed to slot an LLM in without restructuring:

- **Handler pattern** — each intent has a dedicated handler; LLM just becomes another way to resolve intent
- **Session manager** — already tracks full conversation history per user, ready to pass as LLM context
- **Query service abstraction** — LLM output (query name + filters) feeds directly into `QueryService.executeQuery()`
- **Recommendation engine** — provides context (what peers query, time patterns) that can enrich LLM prompts
- **Document index** — existing TF-IDF/BM25 retrieval becomes the "R" in RAG
- **Catalog service** — query metadata (names, descriptions, columns, filters) serves as the LLM's tool schema

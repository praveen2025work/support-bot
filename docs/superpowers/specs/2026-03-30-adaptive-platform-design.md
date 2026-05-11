# Adaptive Platform — Niche Feature Bundle Design

**Date:** 2026-03-30
**Status:** Approved
**Branch:** feat/visual-redesign-chat-ux

## Overview

Four focused features that make MITR AI smarter, faster, and more proactive — addressing discoverability, speed-to-insight, comprehensive alerting, and adaptive intelligence. All features are self-hosted with no external LLM dependency, but architecturally ready for LLM enhancement later.

**Target users:** Internal business analysts (daily power users), executives (quick insights), IT/data engineering (platform management).

**Core pain points addressed:**

1. Users don't know what data is available
2. Getting insights takes too many clicks
3. Monitoring/alerting is too basic
4. The platform doesn't learn or adapt to usage patterns

---

## Feature 1: Data Catalog with Usage Signals

### Purpose

A searchable registry page (`/catalog`) answering "what data do we have?" — every registered query, its columns, data types, descriptions, source connector, and owner — enriched with live usage signals.

### UI

- New sidebar nav item: "Catalog" (between Chat and Dashboard)
- Main view: searchable/filterable card grid or table of all queries
- Each entry shows:
  - Query name, description, tags
  - Connector type icon (MSSQL / Oracle / CSV)
  - Column count, owner
  - **Usage signals:** execution count (last 7d), "trending" badge if usage is rising, "popular with [role]" tag from recommendation engine's user-cluster data
- Click a query → detail page showing:
  - Full column schema (name, type, sample values)
  - Related queries (from co-occurrence data)
  - Who uses it most, last execution time
  - "Try in Chat" button → opens chat with query pre-filled
  - "Add to Dashboard" button → opens dashboard card creation modal

### Search

Full-text search across query names, descriptions, column names, and tags. Fuzzy matching using the existing Fuse.js dependency.

### Data Sources

Reads from existing files — no new data collection needed:

- `data/queries.json` — query definitions
- `data/connectors.json` — connector configs
- Recommendation engine data: `co-occurrence.json`, `signal-aggregates.json`, `user-clusters.json`

### Admin Changes

Queries admin page gets new fields:

- `description` (text) — human-readable explanation of what the query returns
- `tags` (string array) — categorization labels (e.g., "finance", "sales", "inventory")
- `owner` (string) — assigned owner per query

---

## Feature 2: Query Chains (Saved Workflows)

### Purpose

Save multi-step query sequences as reusable, one-click workflows. Instead of 5 chat messages to get a result, save the sequence and replay it.

### How It Works

1. After a multi-step chat interaction (e.g., "run sales report" → "filter by region east" → "group by product" → "sort by total desc"), a "Save as Workflow" button appears in the chat
2. User names the workflow and optionally marks parameters as "ask me each time" (e.g., the region filter becomes a prompt)
3. Saved workflows appear in:
   - Chat sidebar (quick access)
   - Catalog page (workflows tab alongside queries)
   - Dashboard (can wire a card to run a workflow)

### Workflow Schema

```json
{
  "id": "wf_001",
  "name": "Regional Sales Breakdown",
  "steps": [
    { "type": "query", "queryName": "sales_report", "filters": {} },
    { "type": "filter", "column": "region", "value": "$param:region" },
    { "type": "groupBy", "column": "product" },
    { "type": "sort", "column": "total", "direction": "desc" }
  ],
  "params": [{ "name": "region", "type": "select", "options": "dynamic" }],
  "owner": "jdoe",
  "visibility": "group",
  "createdAt": "2026-03-30T10:00:00Z"
}
```

### Execution

- Engine replays steps sequentially against the query pipeline
- Parameterized steps prompt the user first (small form, reusing existing `QueryFilterForm` component)
- Final result renders as a normal query result in chat or data panel

### Sharing

Workflows have `private` or `group` visibility, same pattern as existing grid views.

### Storage

New file: `data/workflows/{groupId}.json` — follows existing file-based storage pattern.

### Session Integration

The session manager already tracks conversation history with intent + filters per turn. "Save as Workflow" extraction reads from `session.history` to construct the step chain.

---

## Feature 3: Watch Rules Engine

### Purpose

User-configurable alert rules that continuously monitor data and notify when conditions are met. Covers four alert types: threshold breaches, trend shifts, anomalies, and data freshness.

### Rule Types

| Type          | Example                                                    | Evaluation Method                                                                                                                                               |
| ------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Threshold** | "Alert me when error_rate > 5%"                            | Runs query on schedule, compares column value against operator + threshold                                                                                      |
| **Trend**     | "Alert me when revenue trend reverses"                     | Uses existing linear regression — compares slope direction of last 7 data points against previous 7; triggers when sign flips (positive→negative or vice versa) |
| **Anomaly**   | "Alert me when any column in sales_report has z-score > 3" | Extends existing anomaly detector (already computes z-scores)                                                                                                   |
| **Freshness** | "Alert me when inventory_feed hasn't updated in 2 hours"   | Tracks last-execution timestamp per query, checks staleness on schedule                                                                                         |

### Rule Creation UI

Accessible from 3 places:

- Dashboard card toolbar ("Watch this" action)
- Catalog query detail page
- Dedicated `/watch` page listing all rules

Form flow: select query → select rule type → configure condition → set check frequency (cron, reusing existing schedule infrastructure) → choose notification channels (in-app, email)

Each rule has: name, owner, enabled/disabled toggle, snooze option (suppress for N hours).

### Notification Center

- New bell icon in the top bar with unread count badge
- Dropdown panel: recent alerts with severity icon, rule name, triggered value, timestamp, "View Data" link
- Alerts persist in `data/watch/{groupId}/alerts.jsonl` (append-only log)
- Email notifications reuse existing `email-service.ts`

### Evaluation Engine

- Extends existing `schedule-executor.ts` — watch rules are a new schedule type
- Each check cycle: run query → evaluate condition → if triggered, write alert + send notifications
- **Deduplication:** same rule won't re-alert within its cooldown window (configurable, default 1 hour)

### Storage

- Rule definitions: `data/watch/{groupId}/rules.json`
- Alert history: `data/watch/{groupId}/alerts.jsonl`

### Integration with Existing Systems

- Anomaly rules piggyback on `anomaly-detector.ts` baselines — no duplicate computation
- Threshold/trend rules reuse `QueryService.executeQuery()` — same path as chat and dashboard
- Schedule infrastructure already exists — watch rules are a new job type
- Dashboard cards with active watch rules show a "watching" indicator icon

---

## Feature 4: Adaptive Home Feed

### Purpose

A personalized landing page (`/home`) that proactively surfaces what matters to each user — no clicks required. Replaces direct-to-chat as the default entry point.

### Feed Sections (top to bottom)

#### 1. Morning Briefing Card

- Auto-generated summary: "Since you last logged in: 3 anomalies detected, 2 watch rules triggered, sales_report was queried 47 times by your team"
- Generated server-side by aggregating: watch alert log, anomaly history, recommendation engine's time-pattern data, user's own query history
- Refreshes once per session start (not real-time — lightweight)
- Template-based string assembly (not LLM-generated, but designed for LLM enhancement later)

#### 2. Your KPIs Strip

- User pins their most-watched metrics (reuses existing `KpiCard` component)
- Pulls from any query — not tied to a specific dashboard
- Shows: current value, delta since last check, threshold badge if watch rule is breaching
- Configurable via "Pin KPI" action available in chat results, catalog, and dashboard cards

#### 3. Active Alerts

- Recent triggered watch rules, sorted by severity and recency
- Each alert: rule name, triggered value, timestamp, one-click "View Data" to jump to query result
- Powered by Watch Rules notification center data

#### 4. Suggested Queries

- "People in your role are checking [X] right now" — collaborative filtering + time-pattern data
- "You usually check [Y] around this time" — user's own history patterns
- Click to execute immediately in chat
- Data sources: existing `co-occurrence.json`, `time-patterns.json`, `user-clusters.json`

#### 5. Recent Activity

- Last 5 queries with results preview (query name, filter used, row count, timestamp)
- "Resume" button to re-run with same filters

### Navigation Change

- `/home` becomes the default route (currently `/` goes to chat)
- Chat accessible at `/chat` and via sidebar
- Sidebar gets "Home" as the top icon

### Personalization Storage

User preferences for pinned KPIs and feed settings extend existing `data/preferences/{userId}.json` schema.

### No External Dependencies

Everything computed from data the recommendation engine and watch rules already produce.

---

## Feature Dependency Graph

```
Data Catalog ──────────┐
  (query metadata,     │
   usage signals)      ├──→ Adaptive Home Feed
                       │     (briefing, suggestions,
Watch Rules Engine ────┘      alerts, KPIs)
  (alerts, freshness,
   trend monitoring)

Query Chains ──────────────→ Standalone
  (saved workflows,           (but linkable from
   parameterized replay)       Catalog & Home Feed)
```

**Build order recommendation:**

1. Data Catalog — foundational, enriches all other features
2. Watch Rules Engine — provides alert data for Home Feed
3. Query Chains — independent, can ship in parallel with #2
4. Adaptive Home Feed — consumes data from Catalog + Watch Rules

---

## LLM-Ready Architecture

All four features are designed so an LLM can enhance them later without restructuring:

| Feature               | Current (self-hosted)         | Future (with LLM)                                               |
| --------------------- | ----------------------------- | --------------------------------------------------------------- |
| Data Catalog search   | Fuse.js fuzzy text matching   | Natural language: "show me anything related to monthly revenue" |
| Query Chains creation | Manual save from chat history | "Create a workflow that checks sales by region weekly"          |
| Watch Rules creation  | Form-based rule builder       | "Alert me if anything unusual happens with inventory"           |
| Morning Briefing      | Template string assembly      | Natural language narrative summarizing insights                 |

---

## Storage Summary

| Feature      | New Files                                                              | Pattern                                                 |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Data Catalog | None (reads existing files)                                            | Extends queries.json schema with description/tags/owner |
| Query Chains | `data/workflows/{groupId}.json`                                        | Same as existing file-based stores                      |
| Watch Rules  | `data/watch/{groupId}/rules.json`, `data/watch/{groupId}/alerts.jsonl` | JSON for config, JSONL for append-only log              |
| Home Feed    | None (extends `data/preferences/{userId}.json`)                        | Adds pinnedKpis, feedSettings to existing schema        |

---

## Existing Code Reuse

| Existing System                                                                    | Reused By                                    |
| ---------------------------------------------------------------------------------- | -------------------------------------------- |
| Recommendation engine (co-occurrence, collaborative, time-patterns, user-clusters) | Catalog usage signals, Home Feed suggestions |
| Anomaly detector (z-score baselines)                                               | Watch Rules anomaly type                     |
| Schedule executor (cron jobs)                                                      | Watch Rules evaluation                       |
| Email service                                                                      | Watch Rules notifications                    |
| Session manager (history tracking)                                                 | Query Chains extraction                      |
| QueryService.executeQuery()                                                        | Watch Rules threshold/trend evaluation       |
| KpiCard component                                                                  | Home Feed KPI strip                          |
| QueryFilterForm component                                                          | Query Chains parameter prompts               |
| Fuse.js                                                                            | Catalog search                               |

# App Specification — for Design Reference

A structured snapshot of what this app is, who uses it, and every
surface / component it ships. Hand this to a design tool (Claude,
Figma plugin, etc.) when you want context without reading 50k lines
of code.

---

## 1. One-paragraph pitch

A natural-language data assistant for business teams — a low-cost,
low-code alternative to the BI middleware between Tableau / Power BI
and the people who actually need answers. Business users ask
questions in their own words ("run pnl_lineage", "why did revenue
drop", "break it down by region"); admins teach the bot vocabulary
instead of writing SQL. Three core surfaces: **Chat**, **Data
Explorer** (no-code dashboards), and **GridBoard** (editable
spreadsheet over the same data). All driven by a single classical-ML
NLP engine — no LLM dependency.

---

## 2. Audience & roles

| Role        | Permission level        | Primary surface       |
| ----------- | ----------------------- | --------------------- |
| **viewer**  | read-only               | Chat, Data Explorer   |
| **builder** | edit data, save views   | GridBoard, Dashboards |
| **admin**   | manage vocabulary, RBAC | `/admin/*`            |

Identity flows in via Windows-authenticated AD endpoint (passthrough).
Role grant happens in `src/config/users.json`; `samAccountName` is the
join key.

---

## 3. Top-level surfaces (page routes)

| Path                 | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `/`                  | Chat — primary user surface                 |
| `/landing`           | Landing page (anonymous / pre-login)        |
| `/home`              | Personalized home feed                      |
| `/data-explorer`     | No-code dashboard builder (CSV/XLSX-aware)  |
| `/gridboard`         | Editable spreadsheet over any catalog query |
| `/dashboard`         | Saved-query monitoring dashboard            |
| `/catalog`           | Browseable query catalog                    |
| `/share/[id]`        | Read-only view of a shared snapshot         |
| `/widget`            | Embeddable chat for third-party pages       |
| `/onboard`           | Tenant onboarding wizard (WIP)              |
| `/admin`             | Operator surface (see Section 4)            |
| `/watch`             | Watch rules + alert center                  |
| `/features`          | Feature flag UI                             |
| `/action-panel-demo` | Internal action panel demo                  |

---

## 4. Admin sub-surfaces

| Path                           | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `/admin`                       | Group selector + overview                           |
| `/admin/intents`               | NLP intent registry editor                          |
| `/admin/synonyms`              | Per-group vocabulary substitution                   |
| `/admin/glossary`              | Per-group business glossary (definitions, formulas) |
| `/admin/templates`             | Response template editor                            |
| `/admin/files`                 | Document / file upload + indexing                   |
| `/admin/test-console`          | NLP test harness                                    |
| `/admin/analytics`             | NLP-miss aggregates, query volume                   |
| `/admin/logs`                  | Conversation log viewer                             |
| `/admin/learning`              | Review queue + retrain trigger                      |
| `/admin/audit`                 | Append-only audit trail                             |
| `/admin/schedules`             | Recurring queries + email/Slack alerts              |
| `/admin/anomaly`               | Anomaly baselines + rules                           |
| `/admin/connectors`            | SQL connector configuration                         |
| `/admin/connectors/csv`        | CSV / XLSX source registration                      |
| `/admin/filters`               | Filter config (UI affordances per filter)           |
| `/admin/users`                 | RBAC user list                                      |
| `/admin/settings`              | Global settings                                     |
| `/admin/api-docs`              | OpenAPI 3.0 reference (Redoc)                       |
| `/admin/guides/user-guide`     | End-user how-to                                     |
| `/admin/guides/config-guide`   | Operator configuration                              |
| `/admin/guides/docker-setup`   | Container deployment                                |
| `/admin/guides/linux-setup`    | Linux setup                                         |
| `/admin/guides/windows-setup`  | Windows setup                                       |
| `/admin/guides/learning-guide` | Learning loop reference                             |

---

## 5. Capability layers

### Natural-language UX

- 11+ follow-up phrasings (`group by`, `break down by`, `split by`, `for each`, `per`)
- Semantic column synonyms + per-group operator-edited vocabulary
- Per-group business **glossary** (formal metric definitions, aliases, formulas)
- Type-ahead **autocomplete** with click-through learning — picks bump future ranks per user (14-day decay)
- Drill-down chip on grouped results
- Closed **learning loop** — admin approves low-confidence interactions, retrain merges them into the live NLP corpus
- **Active-document QA** — after `run incident_report`, questions like "how many incidents", "what is the severity", "what was the root cause" answer from the loaded markdown

### Proactive analytics (all rule-based, no LLM)

- **Auto-insights** ("💡 EMEA drives 45% of revenue") prepended to chat results and Data Explorer dashboards
- **Change narratives** ("FYI **revenue** is up 12% vs. 5 min ago") against the prior anomaly snapshot
- **Root cause analysis** — chat `"what is driving X"` ranks top contributors by share of total
- **Trend badge** (`↑ 12.3%`) on every KPI tile with a date column
- **On-demand forecast** sparkline per KPI (exponential smoothing)
- Unified **Data Quality** card — duplicates + missing % + schema drift + anomaly count

### Security

- PII detection (9 kinds) — masked by default, `pii.view` permission unmasks with audit
- Cross-group session isolation
- Passthrough Windows auth (Negotiate / NTLM via IIS / nginx-spnego)
- Structured 4xx/5xx envelopes with `requestId` correlation
- Rate limiting, request-size limits, security headers
- Optimistic concurrency (`If-Match: <version>`) on GridBoard view saves

### Reliability

- Per-query result cache (60s) with stale-while-error fallback
- Per-baseUrl circuit breaker + retry
- Data-source health monitor (probes every 30s)
- Schema drift detection + admin acknowledge
- JSONL rotation at 10MB
- Concurrent retrain coalescing
- Engine idle TTL eviction (30 min)

### Observability

- Prometheus `/api/metrics` with chat counts, histograms, source health gauges
- `x-request-id` correlation end-to-end (logs + audit + UI errors)
- NLP-miss analytics (top failing phrases, retry rate)
- Audit trail per mutation, PII clear-view, snapshot, drift event

### Process

- 160+ check automated validation harness (`npm run validate:demo`)
- GitHub Actions CI workflow runs the harness on every PR
- OpenAPI 3.0 reference
- Demo flow rehearsal script + Self-Test playbook

---

## 6. Component inventory (by feature area)

### Chat (`src/components/chat/`)

| Component             | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `ChatWindow`          | Top-level chat layout                                    |
| `ChatInput`           | Input box + autocomplete dropdown + display-mode toggles |
| `MessageList`         | Scrollable message stream                                |
| `MessageBubble`       | Single message render                                    |
| `RichContentRenderer` | Routes `richContent.type` to specialized renderers       |
| `DataChart`           | Auto-detected chart (bar/line/area/pie)                  |
| `SuggestionChips`     | Smart suggestion chips below a result                    |

### Data Explorer (`src/components/data-explorer/`)

| Component               | What it does                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `useDataExplorer`       | Hook: sources, schema, query, anomalies, insights                         |
| `useDataDashboard`      | Hook: dashboard config + layout + persistence                             |
| `DataCardRenderer`      | Polymorphic card body (KPI / chart / table / lineage / summary / quality) |
| `ExplorerKpis`          | Multi-KPI row                                                             |
| `ExplorerDataTable`     | Sortable / paginated table                                                |
| `AutoFilterPanel`       | Auto-discovered filter dropdowns + search box + group-by                  |
| `AddDataCardModal`      | "Add Card" picker                                                         |
| `DataCardSettingsModal` | Per-card settings editor                                                  |
| `ViewRegistry`          | Plugin registry for custom card kinds                                     |

Page: `src/app/data-explorer/page.tsx`.

### GridBoard (`src/components/gridboard/`)

| Component             | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `GridBoardShell`      | Page-level state + query picker + filter bar            |
| `AgEditableDataGrid`  | AG-Grid wrapper with edit / save / undo / formulas      |
| `GridToolbar`         | All toolbar controls (views, formats, find, pivot, etc) |
| `GridBoardModals`     | Bulk-edit / Formula-editor / Shortcuts overlay          |
| `ColumnHeaderMenu`    | Per-column actions                                      |
| `FindReplaceBar`      | Ctrl+F find/replace UI                                  |
| `ChangeHistoryPanel`  | Audit-log style change history                          |
| `ImportModal`         | CSV / clipboard import                                  |
| `PivotTable`          | Pivot rendering                                         |
| `SparklineCell`       | Per-cell sparkline renderer                             |
| `ValidationIndicator` | Cell-level validation badge                             |
| `MultiSelectDropdown` | Reusable multi-select control                           |
| `useGridKeyboard`     | Hook: keyboard navigation                               |
| `grid-helpers`        | Pure functions: aggregations, formats, formula eval     |

### Dashboard (`src/components/dashboard/`)

| Component            | What it does                               |
| -------------------- | ------------------------------------------ |
| `DashboardShell`     | Top-level dashboard with cards + tabs      |
| `GridDashboard`      | Drag-resize card grid                      |
| `SimpleGrid`         | Lighter grid variant used by Data Explorer |
| `QueryCard`          | Standard query result card                 |
| `AnomalyBadge`       | Click-to-expand anomaly chip               |
| `LineageFlowDiagram` | PnL lineage flow chart                     |
| `CardSettingsModal`  | Per-card settings                          |
| `AddCardModal`       | New card picker                            |

### Shell + chrome (`src/components/shell/`)

| Component            | What it does                           |
| -------------------- | -------------------------------------- |
| `Sidebar`            | Left-rail nav                          |
| `ContextualTopBar`   | Page-aware top bar with group switcher |
| `NotificationCenter` | Bell icon + dropdown alerts            |

### Admin (`src/app/admin/components/`)

| Component       | What it does                                                                           |
| --------------- | -------------------------------------------------------------------------------------- |
| `Sidebar`       | Admin left rail (sections: Management / Tools / Data Sources / Configuration / Guides) |
| `ChatbotWidget` | Floating chat button shown across admin pages                                          |

### Shared UI (`src/components/ui/` + `src/components/shared/`)

| Component               | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `Toast` / `useToast`    | Top-right toast notifications (success / error / warning) |
| `ScrollToTop`           | Floating up arrow                                         |
| `FilterInput`           | Polymorphic filter input (text / select / date)           |
| `FileDropZone`          | Drag-and-drop file upload                                 |
| `KeyboardShortcutsHelp` | Global shortcuts overlay                                  |
| `ThemeToggle`           | Light / dark switch                                       |
| `AppHeader`             | Pre-shell top header (anonymous routes)                   |

### Watch (`src/components/watch/`)

| Component              | What it does                       |
| ---------------------- | ---------------------------------- |
| `NotificationCenter`   | Bell-icon dropdown of watch alerts |
| `WatchRuleDetailPanel` | Per-rule detail view               |

### Widget (`src/app/widget/`)

Embedded chat that can be iframed into a host page.

---

## 7. API surface (engine endpoints)

Chat-side:

- `POST /api/chat` — primary chat entry point
- `GET /api/queries` — catalog (supports `?userName=X` for usage reorder)
- `GET /api/queries/search` — semantic search (personalised when `userName` supplied)
- `POST /api/queries/search/pick` — record autocomplete click-through
- `GET /api/health`, `/api/health/ready` — probes
- `GET /api/metrics` — Prometheus
- `GET /api/openapi.json` — spec

Data:

- `POST /api/data/query` — Data Explorer (CSV/XLSX) row query with attached insights
- `POST /api/data/rows/:queryName` — GridBoard generic row fetch (any source type) with attached insights
- `GET /api/data/sources` — source list (reorders by user usage when `userName` supplied)
- `POST /api/data/sources/view` — record source-open interaction
- `GET /api/data/schema/:queryName` — column schema
- `GET /api/data/distinct/:queryName/:column` — distinct values for filter
- `POST /api/data/anomalies` — anomaly detection over the filtered view
- `GET /api/data/quality/:queryName` — unified quality snapshot (dup / null / drift / anomaly count)
- `GET /api/data/forecast/:queryName` — exponential-smoothing forecast

GridBoard views:

- `GET /api/gridboard-views?userId=&queryName=&groupId=` — list private + public
- `POST /api/gridboard-views` — create
- `PUT /api/gridboard-views/:id` (with `If-Match: <version>`) — update; 409 on stale
- `DELETE /api/gridboard-views/:id`

Admin (gated by RBAC):

- Glossary, synonyms, intents, templates, settings — CRUD
- Learning review / retrain
- Schema drift / acknowledge
- Source health / recheck
- Audit log read

Identity:

- `GET /api/userinfo` — proxies to `USER_INFO_URL`, forwards Windows-auth headers

---

## 8. Design system

**Theming**: `src/styles/tokens.css` defines all design tokens as CSS
custom properties. Two themes ship: light (default) and dark. Brand
color is injected at `:root` by `ThemeProvider` and is per-tenant
overridable.

### Tokens

| Group    | Variables                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------- |
| Brand    | `--brand`, `--brand-subtle`, `--brand-hover`, `--brand-active`, `--brand-text`                  |
| Surfaces | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`                                               |
| Text     | `--text-primary`, `--text-secondary`, `--text-muted`                                            |
| Status   | `--success`, `--success-subtle`, `--danger`, `--danger-subtle`, `--warning`, `--warning-subtle` |
| Borders  | `--border`, `--border-subtle`                                                                   |
| Shadows  | `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`                                      |
| Radius   | `--radius-sm` (4), `--radius-md` (8), `--radius-lg` (12), `--radius-full`                       |
| Spacing  | `--space-xs / sm / md / lg / xl` (4 / 8 / 12 / 16 / 24 px)                                      |

### Conventions

- **Use tokens, not hex.** New components should reference
  `var(--brand)` etc. Hardcoded Tailwind palette values (`bg-amber-50`,
  `text-emerald-500`) work but break dark mode; prefer
  `color-mix(in srgb, var(--brand) 12%, transparent)` for tinted
  backgrounds.
- **Icons**: Lucide (`lucide-react`). Sizes: 11 / 12 / 13 / 14 / 16 / 18.
  Consistency wins — pick a base size per surface and stick to it.
- **Type scale**: `text-[10px]` (microcopy / pills),
  `text-[11px]` (metadata), `text-[12px]` (controls),
  `text-[13px]` (body), `text-sm` (default), `text-base` (titles).
- **Modals**: 420px standard width, 500px for editors, 80vh max
  height. Always have an X close button + Esc handler. Click outside
  closes.
- **Toasts**: top-right, slide-in from right, 5s auto-dismiss for
  success, manual close for error/warning.
- **Empty states**: icon + 16px semibold heading + muted 13px body +
  one CTA.

### Status colors (severity language)

| Severity | Foreground                      | Tinted background                                   |
| -------- | ------------------------------- | --------------------------------------------------- |
| info     | `--brand` or `--text-secondary` | `color-mix(in srgb, var(--brand) 12%, transparent)` |
| success  | `--success`                     | `--success-subtle`                                  |
| warning  | `--warning`                     | `--warning-subtle`                                  |
| critical | `--danger`                      | `--danger-subtle`                                   |

Use these consistently for KPI trend badges, insights, quality tiles,
anomaly chips, validation badges.

---

## 9. Core user flows

### Flow A — Ask a question (chat path)

1. User types `run pnl_lineage` (or just `pnl`) in chat.
2. Autocomplete dropdown surfaces matching queries; Tab inserts.
3. Bot returns a table + 💡 auto-insights prefix.
4. User types follow-up: `break it down by region`, `find outliers`,
   `what is driving the change` (root cause), `summarize`, `export`.

### Flow B — Build a dashboard (Data Explorer)

1. Pick a source from the dropdown.
2. Engine auto-generates 4 KPIs + chart + summary + table + Data
   Quality card.
3. KPI tiles show trend badges + "show forecast" sparkline.
4. Insights strip surfaces top-mover / concentration findings.
5. Edit layout → save / revert.

### Flow C — Edit data (GridBoard)

1. Pick a query → Load Data.
2. Edit cells inline; dirty markers + change history.
3. Ctrl+Z / Ctrl+Y for undo / redo.
4. Bulk-edit selected rows; add formula columns; export to xlsx;
   share view URL.
5. Save → goes through engine write-back with optimistic concurrency.

### Flow D — Operator teaches the bot (admin)

1. `/admin/synonyms` — add `customer = client, account, buyer`.
2. `/admin/glossary` — define "Net Revenue = Gross - returns".
3. `/admin/learning` — approve a borderline interaction → Retrain.
4. `/admin/audit` — every mutation is logged.

### Flow E — Get a question answered from a document

1. `run incident_report` — loads a markdown file as the active context.
2. Ask `how many incidents`, `what is the severity`, `what was the
root cause` — engine scores each against the loaded content and
   returns the matching sentence.

---

## 10. Out of scope (for now)

- **LLM-assisted re-ranking** — classical ML ensemble is the design.
- **Real-time collaborative editing** of GridBoard views.
- **Multi-tenant DB swap** — engine is JSON/JSONL on disk; fine for
  pilot scale (~100 users), Postgres migration deferred.
- **AG-Grid Enterprise** features (range select / multi-cell paste).
- **Mobile apps** — web + widget is enough through pilot.

---

## 11. Where to drill in

| If you want to design...     | Read these files                                         |
| ---------------------------- | -------------------------------------------------------- |
| Chat layout                  | `src/components/chat/ChatWindow.tsx`, `ChatInput.tsx`    |
| Data Explorer header / cards | `src/app/data-explorer/page.tsx`, `DataCardRenderer.tsx` |
| GridBoard toolbar            | `src/components/gridboard/GridToolbar.tsx`               |
| Admin sidebar / nav          | `src/app/admin/components/Sidebar.tsx`                   |
| Theme tokens                 | `src/styles/tokens.css`                                  |
| Existing design conventions  | `docs/USER-GUIDE.md`, `docs/DEMO-FLOW.md`                |
| Latest feature deltas        | `docs/NEXT-STEPS.md` (top of file)                       |
| How to test what's shipped   | `docs/SELF-TEST.md`                                      |

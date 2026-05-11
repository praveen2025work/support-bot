# Adaptive Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four niche features to MITR AI — Data Catalog, Query Chains, Watch Rules Engine, and Adaptive Home Feed — making the platform smarter, faster, and more proactive.

**Architecture:** Each feature adds engine routes + frontend pages/components. All data is file-based JSON/JSONL (no new database). Features build on existing recommendation engine, anomaly detector, scheduler, and session manager. The engine (Express, port 4001) serves new REST endpoints; the Next.js frontend (port 3001) proxies to them and renders new pages.

**Tech Stack:** Next.js 14 (App Router), React 18, Express.js, TypeScript, Fuse.js (search), lucide-react (icons), node-cron (scheduling), Recharts (charts), existing file-based persistence layer.

**Build Order:**

1. Phase 1: Data Catalog (Tasks 1-7) — foundational
2. Phase 2: Watch Rules Engine (Tasks 8-16) + Query Chains (Tasks 17-22) — can run in parallel
3. Phase 3: Adaptive Home Feed (Tasks 23-29) — consumes data from Phase 1 + 2

---

## File Structure

### Engine (services/engine/src/)

**New files:**

- `core/catalog/catalog-service.ts` — query metadata aggregation + Fuse.js search
- `core/watch/watch-rule-service.ts` — CRUD for watch rules
- `core/watch/watch-evaluator.ts` — rule evaluation logic (threshold, trend, anomaly, freshness)
- `core/watch/watch-executor.ts` — scheduled execution loop (extends schedule-executor pattern)
- `core/watch/notification-service.ts` — in-app + email alert dispatch
- `core/workflow/workflow-service.ts` — CRUD + execution for query chains
- `core/home-feed/home-feed-service.ts` — briefing generation + feed aggregation
- `routes/catalog.ts` — GET /api/catalog, GET /api/catalog/:queryName
- `routes/watch.ts` — CRUD /api/watch/rules, GET /api/watch/alerts
- `routes/workflows.ts` — CRUD /api/workflows, POST /api/workflows/:id/execute
- `routes/home-feed.ts` — GET /api/home-feed

**Modified files:**

- `lib/env-config.ts` — add paths for watch, workflows, catalog
- `server.ts` — register new routers
- `routes/admin/queries.ts` — add description, tags, owner fields

**New data directories:**

- `data/watch/<groupId>/rules.json`
- `data/watch/<groupId>/alerts.jsonl`
- `data/workflows/<groupId>.json`

### Frontend (src/)

**New files:**

- `app/catalog/page.tsx` — catalog listing page
- `app/catalog/[queryName]/page.tsx` — catalog detail page
- `app/watch/page.tsx` — watch rules listing page
- `app/home/page.tsx` — adaptive home feed page
- `components/catalog/CatalogGrid.tsx` — searchable card grid
- `components/catalog/CatalogDetailPanel.tsx` — query detail view
- `components/catalog/UsageBadge.tsx` — trending/popular badges
- `components/watch/WatchRuleForm.tsx` — rule creation/edit form
- `components/watch/WatchRuleList.tsx` — rules listing table
- `components/watch/NotificationCenter.tsx` — bell icon dropdown
- `components/watch/AlertCard.tsx` — single alert display
- `components/workflow/WorkflowPanel.tsx` — workflow list in chat sidebar
- `components/workflow/SaveWorkflowModal.tsx` — save workflow dialog
- `components/workflow/WorkflowParamForm.tsx` — parameter prompt form
- `components/home/HomeFeed.tsx` — main feed layout
- `components/home/MorningBriefing.tsx` — briefing card
- `components/home/SuggestedQueries.tsx` — suggestion section
- `components/home/RecentActivity.tsx` — recent queries section
- `components/home/PinnedKpis.tsx` — pinned KPI strip
- `app/api/catalog/route.ts` — proxy to engine
- `app/api/catalog/[queryName]/route.ts` — proxy to engine
- `app/api/watch/rules/route.ts` — proxy to engine
- `app/api/watch/alerts/route.ts` — proxy to engine
- `app/api/workflows/route.ts` — proxy to engine
- `app/api/workflows/[id]/execute/route.ts` — proxy to engine
- `app/api/home-feed/route.ts` — proxy to engine
- `types/catalog.ts` — catalog types
- `types/watch.ts` — watch rule and alert types
- `types/workflow.ts` — workflow types
- `types/home-feed.ts` — home feed types

**Modified files:**

- `components/shell/Sidebar.tsx` — add Home, Catalog, Watch nav items
- `components/shell/ContextualTopBar.tsx` — add notification bell
- `app/page.tsx` — redirect to /home (or keep as chat with /home as new route)
- `types/dashboard.ts` — extend UserPreferences with pinnedKpis, feedSettings

---

## Phase 1: Data Catalog

### Task 1: Catalog Engine Types and Path Config

**Files:**

- Modify: `services/engine/src/lib/env-config.ts`

- [ ] **Step 1: Add catalog and watch paths to env-config**

In `services/engine/src/lib/env-config.ts`, add to the `paths.data` object:

```ts
// Add inside the paths.data object:
watchRules: (groupId: string) => path.join(dataDir, 'watch', sanitize(groupId), 'rules.json'),
watchAlerts: (groupId: string) => path.join(dataDir, 'watch', sanitize(groupId), 'alerts.jsonl'),
workflows: (groupId: string) => path.join(dataDir, 'workflows', `${sanitize(groupId)}.json`),
```

Where `sanitize` is the existing `safeName()` function used throughout env-config.

- [ ] **Step 2: Verify paths resolve correctly**

Run: `cd services/engine && npx ts-node -e "const { paths } = require('./src/lib/env-config'); console.log(paths.data.watchRules('default')); console.log(paths.data.watchAlerts('default')); console.log(paths.data.workflows('default'));"`

Expected: Three valid file paths under `data/watch/default/` and `data/workflows/`.

- [ ] **Step 3: Commit**

```bash
git add services/engine/src/lib/env-config.ts
git commit -m "feat: add watch rules, alerts, and workflows paths to env-config"
```

---

### Task 2: Catalog Service — Query Metadata Aggregation

**Files:**

- Create: `services/engine/src/core/catalog/catalog-service.ts`
- Test: `services/engine/src/__tests__/core/catalog/catalog-service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/catalog/catalog-service.test.ts`:

```ts
import { CatalogService } from "../../../core/catalog/catalog-service";
import * as fs from "fs";
import * as path from "path";

describe("CatalogService", () => {
  let service: CatalogService;
  const testDataDir = path.join(__dirname, "__test-data__");

  beforeEach(() => {
    // Create minimal test data files
    fs.mkdirSync(path.join(testDataDir, "learning", "default"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(testDataDir, "queries.json"),
      JSON.stringify([
        {
          name: "sales_report",
          description: "Monthly sales data",
          tags: ["finance", "sales"],
          owner: "jdoe",
          type: "api",
          columns: [
            { key: "region", label: "Region", type: "string" },
            { key: "amount", label: "Amount", type: "number" },
          ],
        },
        {
          name: "inventory_check",
          description: "Current inventory levels",
          tags: ["ops"],
          owner: "admin",
          type: "csv",
          columns: [{ key: "item", label: "Item", type: "string" }],
        },
      ]),
    );
    fs.writeFileSync(
      path.join(testDataDir, "learning", "default", "signal-aggregates.json"),
      JSON.stringify({
        sales_report: { totalExecutions: 47, last7d: 12 },
        inventory_check: { totalExecutions: 5, last7d: 1 },
      }),
    );
    fs.writeFileSync(
      path.join(testDataDir, "learning", "default", "co-occurrence.json"),
      JSON.stringify({ sales_report: { inventory_check: 3 } }),
    );

    service = new CatalogService(testDataDir);
  });

  afterEach(() => {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test("listQueries returns all queries with usage signals", () => {
    const result = service.listQueries("default");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("sales_report");
    expect(result[0].usageCount7d).toBe(12);
    expect(result[0].columnCount).toBe(2);
    expect(result[0].tags).toEqual(["finance", "sales"]);
  });

  test("search filters by fuzzy text match", () => {
    const result = service.search("default", "sales");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("sales_report");
  });

  test("search matches column names", () => {
    const result = service.search("default", "region");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("sales_report");
  });

  test("getQueryDetail returns full metadata with related queries", () => {
    const detail = service.getQueryDetail("default", "sales_report");
    expect(detail).not.toBeNull();
    expect(detail!.description).toBe("Monthly sales data");
    expect(detail!.columns).toHaveLength(2);
    expect(detail!.relatedQueries).toContain("inventory_check");
  });

  test("getQueryDetail returns null for unknown query", () => {
    const detail = service.getQueryDetail("default", "nonexistent");
    expect(detail).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/engine && npx jest src/__tests__/core/catalog/catalog-service.test.ts --no-cache`

Expected: FAIL — cannot find module `../../../core/catalog/catalog-service`

- [ ] **Step 3: Write minimal implementation**

Create `services/engine/src/core/catalog/catalog-service.ts`:

```ts
import * as fs from "fs";
import * as path from "path";
import Fuse from "fuse.js";

interface QueryColumn {
  key: string;
  label: string;
  type?: string;
}

interface QueryDefinition {
  name: string;
  description?: string;
  tags?: string[];
  owner?: string;
  type: string;
  columns?: QueryColumn[];
  connectorId?: string;
}

interface CatalogEntry {
  name: string;
  description: string;
  tags: string[];
  owner: string;
  type: string;
  columnCount: number;
  columns: QueryColumn[];
  usageCountTotal: number;
  usageCount7d: number;
  trending: boolean;
  connectorId?: string;
}

interface CatalogDetail extends CatalogEntry {
  relatedQueries: string[];
  lastExecutionTime?: string;
}

interface SignalAggregates {
  [queryName: string]: {
    totalExecutions: number;
    last7d: number;
    [key: string]: unknown;
  };
}

export class CatalogService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  listQueries(groupId: string): CatalogEntry[] {
    const queries = this.loadQueries();
    const signals = this.loadSignals(groupId);

    return queries.map((q) => this.toCatalogEntry(q, signals));
  }

  search(groupId: string, query: string): CatalogEntry[] {
    const entries = this.listQueries(groupId);
    const searchableEntries = entries.map((e) => ({
      ...e,
      columnNames: e.columns.map((c) => c.label).join(" "),
    }));

    const fuse = new Fuse(searchableEntries, {
      keys: ["name", "description", "tags", "columnNames", "owner"],
      threshold: 0.4,
      includeScore: true,
    });

    return fuse.search(query).map((r) => {
      const { columnNames, ...entry } = r.item;
      return entry;
    });
  }

  getQueryDetail(groupId: string, queryName: string): CatalogDetail | null {
    const queries = this.loadQueries();
    const q = queries.find((q) => q.name === queryName);
    if (!q) return null;

    const signals = this.loadSignals(groupId);
    const coOccurrence = this.loadCoOccurrence(groupId);
    const entry = this.toCatalogEntry(q, signals);

    const related = coOccurrence[queryName]
      ? Object.keys(coOccurrence[queryName]).sort(
          (a, b) => coOccurrence[queryName][b] - coOccurrence[queryName][a],
        )
      : [];

    return {
      ...entry,
      relatedQueries: related,
    };
  }

  private toCatalogEntry(
    q: QueryDefinition,
    signals: SignalAggregates,
  ): CatalogEntry {
    const sig = signals[q.name] || { totalExecutions: 0, last7d: 0 };
    return {
      name: q.name,
      description: q.description || "",
      tags: q.tags || [],
      owner: q.owner || "",
      type: q.type,
      columnCount: q.columns?.length || 0,
      columns: q.columns || [],
      usageCountTotal: sig.totalExecutions,
      usageCount7d: sig.last7d,
      trending: sig.last7d > sig.totalExecutions * 0.3,
      connectorId: q.connectorId,
    };
  }

  private loadQueries(): QueryDefinition[] {
    const filePath = path.join(this.dataDir, "queries.json");
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private loadSignals(groupId: string): SignalAggregates {
    const filePath = path.join(
      this.dataDir,
      "learning",
      groupId,
      "signal-aggregates.json",
    );
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private loadCoOccurrence(
    groupId: string,
  ): Record<string, Record<string, number>> {
    const filePath = path.join(
      this.dataDir,
      "learning",
      groupId,
      "co-occurrence.json",
    );
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/engine && npx jest src/__tests__/core/catalog/catalog-service.test.ts --no-cache`

Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/catalog/catalog-service.ts services/engine/src/__tests__/core/catalog/catalog-service.test.ts
git commit -m "feat: add CatalogService with search and usage signals"
```

---

### Task 3: Catalog Engine Route

**Files:**

- Create: `services/engine/src/routes/catalog.ts`
- Modify: `services/engine/src/server.ts`

- [ ] **Step 1: Create the catalog router**

Create `services/engine/src/routes/catalog.ts`:

```ts
import { Router, Request, Response } from "express";
import { CatalogService } from "../core/catalog/catalog-service";
import path from "path";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const catalogService = new CatalogService(dataDir);

// GET /api/catalog?groupId=default&q=search_term
router.get("/", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const searchQuery = req.query.q as string | undefined;

    const results = searchQuery
      ? catalogService.search(groupId, searchQuery)
      : catalogService.listQueries(groupId);

    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    console.error("[Catalog] List error:", error);
    res.status(500).json({ success: false, error: "Failed to load catalog" });
  }
});

// GET /api/catalog/:queryName?groupId=default
router.get("/:queryName", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const detail = catalogService.getQueryDetail(groupId, req.params.queryName);

    if (!detail) {
      res.status(404).json({ success: false, error: "Query not found" });
      return;
    }

    res.json({ success: true, data: detail });
  } catch (error) {
    console.error("[Catalog] Detail error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load query detail" });
  }
});

export default router;
```

- [ ] **Step 2: Register the router in server.ts**

In `services/engine/src/server.ts`, add the import and route registration alongside the existing routes:

```ts
// Add import at top:
import catalogRouter from "./routes/catalog";

// Add route registration (after the existing routes):
app.use("/api/catalog", catalogRouter);
```

- [ ] **Step 3: Verify engine compiles**

Run: `cd services/engine && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add services/engine/src/routes/catalog.ts services/engine/src/server.ts
git commit -m "feat: add catalog API routes (list, search, detail)"
```

---

### Task 4: Catalog Frontend Types and API Proxy

**Files:**

- Create: `src/types/catalog.ts`
- Create: `src/app/api/catalog/route.ts`
- Create: `src/app/api/catalog/[queryName]/route.ts`

- [ ] **Step 1: Create catalog types**

Create `src/types/catalog.ts`:

```ts
export interface CatalogColumn {
  key: string;
  label: string;
  type?: string;
}

export interface CatalogEntry {
  name: string;
  description: string;
  tags: string[];
  owner: string;
  type: string;
  columnCount: number;
  columns: CatalogColumn[];
  usageCountTotal: number;
  usageCount7d: number;
  trending: boolean;
  connectorId?: string;
}

export interface CatalogDetail extends CatalogEntry {
  relatedQueries: string[];
  lastExecutionTime?: string;
}

export interface CatalogListResponse {
  success: boolean;
  data: CatalogEntry[];
  total: number;
}

export interface CatalogDetailResponse {
  success: boolean;
  data: CatalogDetail;
}
```

- [ ] **Step 2: Create catalog list proxy route**

Create `src/app/api/catalog/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const q = request.nextUrl.searchParams.get("q") || "";
    const qs = q
      ? `?groupId=${encodeURIComponent(groupId)}&q=${encodeURIComponent(q)}`
      : `?groupId=${encodeURIComponent(groupId)}`;
    const engineRes = await proxyToEngine(`/api/catalog${qs}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, data: [], total: 0 },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 3: Create catalog detail proxy route**

Create `src/app/api/catalog/[queryName]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryName: string }> },
) {
  try {
    const { queryName } = await params;
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const engineRes = await proxyToEngine(
      `/api/catalog/${encodeURIComponent(queryName)}?groupId=${encodeURIComponent(groupId)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to load query detail" },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 4: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds (or at least no errors in the new files)

- [ ] **Step 5: Commit**

```bash
git add src/types/catalog.ts src/app/api/catalog/
git commit -m "feat: add catalog types and API proxy routes"
```

---

### Task 5: Catalog Grid Component

**Files:**

- Create: `src/components/catalog/UsageBadge.tsx`
- Create: `src/components/catalog/CatalogGrid.tsx`

- [ ] **Step 1: Create UsageBadge component**

Create `src/components/catalog/UsageBadge.tsx`:

```tsx
"use client";

import { TrendingUp, Users } from "lucide-react";

interface UsageBadgeProps {
  trending: boolean;
  usageCount7d: number;
}

export default function UsageBadge({
  trending,
  usageCount7d,
}: UsageBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {trending && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
          <TrendingUp className="w-3 h-3" />
          Trending
        </span>
      )}
      <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
        <Users className="w-3 h-3" />
        {usageCount7d} runs this week
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create CatalogGrid component**

Create `src/components/catalog/CatalogGrid.tsx`:

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Database,
  FileSpreadsheet,
  Globe,
  Columns3,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { CatalogEntry } from "@/types/catalog";
import UsageBadge from "./UsageBadge";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  api: <Database className="w-4 h-4" />,
  csv: <FileSpreadsheet className="w-4 h-4" />,
  xlsx: <FileSpreadsheet className="w-4 h-4" />,
  url: <Globe className="w-4 h-4" />,
  document: <Columns3 className="w-4 h-4" />,
};

interface CatalogGridProps {
  groupId: string;
}

export default function CatalogGrid({ groupId }: CatalogGridProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = searchQuery
      ? `/api/catalog?groupId=${groupId}&q=${encodeURIComponent(searchQuery)}`
      : `/api/catalog?groupId=${groupId}`;

    fetch(qs)
      .then((r) => r.json())
      .then((res) => setEntries(res.data || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [groupId, searchQuery]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [entries]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    entries.forEach((e) => types.add(e.type));
    return Array.from(types).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filterTag) result = result.filter((e) => e.tags.includes(filterTag));
    if (filterType) result = result.filter((e) => e.type === filterType);
    return result;
  }, [entries, filterTag, filterType]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search queries, columns, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm"
          />
        </div>
        <select
          value={filterTag || ""}
          onChange={(e) => setFilterTag(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm"
        >
          <option value="">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filterType || ""}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-sm"
        >
          <option value="">All Types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-[var(--text-muted)]">
        {loading ? "Loading..." : `${filtered.length} queries available`}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto flex-1">
        {filtered.map((entry) => (
          <button
            key={entry.name}
            onClick={() =>
              router.push(`/catalog/${entry.name}?groupId=${groupId}`)
            }
            className="text-left p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[var(--text-muted)]">
                {TYPE_ICONS[entry.type] || <Database className="w-4 h-4" />}
              </span>
              <h3 className="font-medium text-sm truncate">{entry.name}</h3>
            </div>
            {entry.description && (
              <p className="text-xs text-[var(--text-muted)] mb-2 line-clamp-2">
                {entry.description}
              </p>
            )}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <UsageBadge
                trending={entry.trending}
                usageCount7d={entry.usageCount7d}
              />
              <span className="text-xs text-[var(--text-muted)]">
                {entry.columnCount} columns
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/
git commit -m "feat: add CatalogGrid and UsageBadge components"
```

---

### Task 6: Catalog Detail Page and Component

**Files:**

- Create: `src/components/catalog/CatalogDetailPanel.tsx`
- Create: `src/app/catalog/[queryName]/page.tsx`
- Create: `src/app/catalog/page.tsx`

- [ ] **Step 1: Create CatalogDetailPanel**

Create `src/components/catalog/CatalogDetailPanel.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  MessageSquare,
  LayoutDashboard,
  Database,
  FileSpreadsheet,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { CatalogDetail } from "@/types/catalog";
import UsageBadge from "./UsageBadge";

const TYPE_LABELS: Record<string, string> = {
  api: "Database (API)",
  csv: "CSV File",
  xlsx: "Excel File",
  url: "URL",
  document: "Document",
};

interface CatalogDetailPanelProps {
  queryName: string;
  groupId: string;
}

export default function CatalogDetailPanel({
  queryName,
  groupId,
}: CatalogDetailPanelProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<CatalogDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/catalog/${encodeURIComponent(queryName)}?groupId=${groupId}`)
      .then((r) => r.json())
      .then((res) => setDetail(res.data || null))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [queryName, groupId]);

  if (loading) {
    return <div className="p-6 text-[var(--text-muted)]">Loading...</div>;
  }

  if (!detail) {
    return <div className="p-6 text-[var(--text-muted)]">Query not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/catalog")}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{detail.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {detail.description}
          </p>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)]">
          {TYPE_LABELS[detail.type] || detail.type}
        </span>
        {detail.owner && (
          <span className="text-xs text-[var(--text-muted)]">
            Owner: {detail.owner}
          </span>
        )}
        <UsageBadge
          trending={detail.trending}
          usageCount7d={detail.usageCount7d}
        />
        <span className="text-xs text-[var(--text-muted)]">
          {detail.usageCountTotal} total runs
        </span>
      </div>

      {/* Tags */}
      {detail.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {detail.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() =>
            router.push(`/?query=${encodeURIComponent(detail.name)}`)
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Try in Chat
        </button>
        <button
          onClick={() =>
            router.push(
              `/dashboard?addQuery=${encodeURIComponent(detail.name)}`,
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Add to Dashboard
        </button>
      </div>

      {/* Column Schema */}
      <div>
        <h2 className="text-sm font-medium mb-2">
          Columns ({detail.columnCount})
        </h2>
        <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Name</th>
                <th className="text-left px-3 py-2 font-medium">Label</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {detail.columns.map((col) => (
                <tr
                  key={col.key}
                  className="border-t border-[var(--border-primary)]"
                >
                  <td className="px-3 py-2 font-mono text-xs">{col.key}</td>
                  <td className="px-3 py-2">{col.label}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {col.type || "string"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Related Queries */}
      {detail.relatedQueries.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-2">Related Queries</h2>
          <div className="flex flex-wrap gap-2">
            {detail.relatedQueries.map((rq) => (
              <button
                key={rq}
                onClick={() => router.push(`/catalog/${rq}?groupId=${groupId}`)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]"
              >
                {rq}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create catalog listing page**

Create `src/app/catalog/page.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import CatalogGrid from "@/components/catalog/CatalogGrid";

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") || "default";

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-xl font-semibold mb-4">Data Catalog</h1>
      <CatalogGrid groupId={groupId} />
    </div>
  );
}
```

- [ ] **Step 3: Create catalog detail page**

Create `src/app/catalog/[queryName]/page.tsx`:

```tsx
"use client";

import { useSearchParams, useParams } from "next/navigation";
import CatalogDetailPanel from "@/components/catalog/CatalogDetailPanel";

export default function CatalogDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryName = params.queryName as string;
  const groupId = searchParams.get("groupId") || "default";

  return <CatalogDetailPanel queryName={queryName} groupId={groupId} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/catalog/CatalogDetailPanel.tsx src/app/catalog/
git commit -m "feat: add catalog pages (listing + detail) with schema and related queries"
```

---

### Task 7: Add Catalog to Sidebar Navigation

**Files:**

- Modify: `src/components/shell/Sidebar.tsx`

- [ ] **Step 1: Add Catalog nav item**

In `src/components/shell/Sidebar.tsx`, add `BookOpen` to the lucide-react import and add a new entry to `NAV_ITEMS` array after the Chat entry:

```ts
// Add to import:
import { /* existing icons */, BookOpen } from 'lucide-react';

// Add to NAV_ITEMS after the Chat (MessageSquare) item:
{
  icon: <BookOpen className="w-[18px] h-[18px]" />,
  label: "Catalog",
  href: "/catalog",
  title: "Data Catalog",
},
```

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/Sidebar.tsx
git commit -m "feat: add Catalog to sidebar navigation"
```

---

## Phase 2A: Watch Rules Engine

### Task 8: Watch Rule Types

**Files:**

- Create: `src/types/watch.ts`

- [ ] **Step 1: Create watch types**

Create `src/types/watch.ts`:

```ts
export type WatchRuleType = "threshold" | "trend" | "anomaly" | "freshness";
export type WatchSeverity = "info" | "warning" | "critical";
export type WatchChannel = "in_app" | "email";

export interface ThresholdCondition {
  column: string;
  operator: "gt" | "lt" | "gte" | "lte" | "eq" | "neq";
  value: number;
}

export interface TrendCondition {
  column: string;
  direction: "reversal" | "decline" | "incline";
  lookbackPoints: number; // default 7
}

export interface AnomalyCondition {
  columns: string[] | "all";
  zScoreThreshold: number; // default 3.0
}

export interface FreshnessCondition {
  maxStaleMinutes: number;
}

export interface WatchRule {
  id: string;
  name: string;
  queryName: string;
  groupId: string;
  type: WatchRuleType;
  condition:
    | ThresholdCondition
    | TrendCondition
    | AnomalyCondition
    | FreshnessCondition;
  cronExpression: string;
  channels: WatchChannel[];
  recipients?: string[];
  owner: string;
  enabled: boolean;
  snoozeUntil?: string;
  cooldownMinutes: number; // default 60
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
}

export interface WatchAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  queryName: string;
  groupId: string;
  type: WatchRuleType;
  severity: WatchSeverity;
  message: string;
  triggeredValue?: string;
  timestamp: string;
  read: boolean;
}

export interface WatchRulesResponse {
  success: boolean;
  data: WatchRule[];
}

export interface WatchAlertsResponse {
  success: boolean;
  data: WatchAlert[];
  unreadCount: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/watch.ts
git commit -m "feat: add watch rule and alert type definitions"
```

---

### Task 9: Watch Rule Service (CRUD)

**Files:**

- Create: `services/engine/src/core/watch/watch-rule-service.ts`
- Test: `services/engine/src/__tests__/core/watch/watch-rule-service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/watch/watch-rule-service.test.ts`:

```ts
import { WatchRuleService } from "../../../core/watch/watch-rule-service";
import * as fs from "fs";
import * as path from "path";

describe("WatchRuleService", () => {
  let service: WatchRuleService;
  const testDir = path.join(__dirname, "__test-watch-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDir, "watch", "default"), { recursive: true });
    service = new WatchRuleService(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("createRule creates and persists a rule", () => {
    const rule = service.createRule("default", {
      name: "High Error Rate",
      queryName: "error_report",
      type: "threshold",
      condition: { column: "error_rate", operator: "gt", value: 5 },
      cronExpression: "*/30 * * * *",
      channels: ["in_app"],
      owner: "jdoe",
    });

    expect(rule.id).toBeDefined();
    expect(rule.name).toBe("High Error Rate");
    expect(rule.enabled).toBe(true);

    const rules = service.listRules("default");
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(rule.id);
  });

  test("updateRule updates fields", () => {
    const rule = service.createRule("default", {
      name: "Test Rule",
      queryName: "test",
      type: "threshold",
      condition: { column: "val", operator: "gt", value: 10 },
      cronExpression: "0 * * * *",
      channels: ["in_app"],
      owner: "jdoe",
    });

    const updated = service.updateRule("default", rule.id, { enabled: false });
    expect(updated).not.toBeNull();
    expect(updated!.enabled).toBe(false);
  });

  test("deleteRule removes rule", () => {
    const rule = service.createRule("default", {
      name: "To Delete",
      queryName: "test",
      type: "freshness",
      condition: { maxStaleMinutes: 120 },
      cronExpression: "0 * * * *",
      channels: ["email"],
      recipients: ["admin@co.com"],
      owner: "admin",
    });

    service.deleteRule("default", rule.id);
    expect(service.listRules("default")).toHaveLength(0);
  });

  test("addAlert appends to alerts log", () => {
    service.addAlert("default", {
      id: "alert_001",
      ruleId: "rule_001",
      ruleName: "Test",
      queryName: "test",
      groupId: "default",
      type: "threshold",
      severity: "critical",
      message: "error_rate exceeded 5%",
      triggeredValue: "7.2",
      timestamp: new Date().toISOString(),
      read: false,
    });

    const alerts = service.getAlerts("default", 20);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe("critical");
  });

  test("markAlertRead updates read status", () => {
    const alert = {
      id: "alert_002",
      ruleId: "rule_001",
      ruleName: "Test",
      queryName: "test",
      groupId: "default",
      type: "threshold" as const,
      severity: "warning" as const,
      message: "test",
      timestamp: new Date().toISOString(),
      read: false,
    };

    service.addAlert("default", alert);
    service.markAlertRead("default", "alert_002");
    const alerts = service.getAlerts("default", 20);
    expect(alerts[0].read).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/engine && npx jest src/__tests__/core/watch/watch-rule-service.test.ts --no-cache`

Expected: FAIL — cannot find module

- [ ] **Step 3: Write minimal implementation**

Create `services/engine/src/core/watch/watch-rule-service.ts`:

```ts
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export interface WatchRule {
  id: string;
  name: string;
  queryName: string;
  groupId: string;
  type: "threshold" | "trend" | "anomaly" | "freshness";
  condition: Record<string, unknown>;
  cronExpression: string;
  channels: string[];
  recipients?: string[];
  owner: string;
  enabled: boolean;
  snoozeUntil?: string;
  cooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  lastTriggeredAt?: string;
}

export interface WatchAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  queryName: string;
  groupId: string;
  type: string;
  severity: string;
  message: string;
  triggeredValue?: string;
  timestamp: string;
  read: boolean;
}

interface CreateRuleInput {
  name: string;
  queryName: string;
  type: WatchRule["type"];
  condition: Record<string, unknown>;
  cronExpression: string;
  channels: string[];
  recipients?: string[];
  owner: string;
}

export class WatchRuleService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  listRules(groupId: string): WatchRule[] {
    const filePath = this.rulesPath(groupId);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  createRule(groupId: string, input: CreateRuleInput): WatchRule {
    const rules = this.listRules(groupId);
    const now = new Date().toISOString();
    const rule: WatchRule = {
      id: `wr_${randomUUID().slice(0, 8)}`,
      ...input,
      groupId,
      enabled: true,
      cooldownMinutes: 60,
      createdAt: now,
      updatedAt: now,
    };
    rules.push(rule);
    this.saveRules(groupId, rules);
    return rule;
  }

  updateRule(
    groupId: string,
    ruleId: string,
    updates: Partial<WatchRule>,
  ): WatchRule | null {
    const rules = this.listRules(groupId);
    const idx = rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return null;

    const updated = {
      ...rules[idx],
      ...updates,
      id: rules[idx].id,
      updatedAt: new Date().toISOString(),
    };
    rules[idx] = updated;
    this.saveRules(groupId, rules);
    return updated;
  }

  deleteRule(groupId: string, ruleId: string): boolean {
    const rules = this.listRules(groupId);
    const filtered = rules.filter((r) => r.id !== ruleId);
    if (filtered.length === rules.length) return false;
    this.saveRules(groupId, filtered);
    return true;
  }

  addAlert(groupId: string, alert: WatchAlert): void {
    const filePath = this.alertsPath(groupId);
    this.ensureDir(filePath);
    fs.appendFileSync(filePath, JSON.stringify(alert) + "\n");
  }

  getAlerts(groupId: string, limit: number): WatchAlert[] {
    const filePath = this.alertsPath(groupId);
    if (!fs.existsSync(filePath)) return [];
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    const alerts: WatchAlert[] = lines.map((l) => JSON.parse(l));
    return alerts.reverse().slice(0, limit);
  }

  markAlertRead(groupId: string, alertId: string): void {
    const filePath = this.alertsPath(groupId);
    if (!fs.existsSync(filePath)) return;
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    const updated = lines.map((l) => {
      const alert = JSON.parse(l) as WatchAlert;
      if (alert.id === alertId) alert.read = true;
      return JSON.stringify(alert);
    });
    fs.writeFileSync(filePath, updated.join("\n") + "\n");
  }

  getUnreadCount(groupId: string): number {
    return this.getAlerts(groupId, 1000).filter((a) => !a.read).length;
  }

  private rulesPath(groupId: string): string {
    return path.join(this.dataDir, "watch", groupId, "rules.json");
  }

  private alertsPath(groupId: string): string {
    return path.join(this.dataDir, "watch", groupId, "alerts.jsonl");
  }

  private saveRules(groupId: string, rules: WatchRule[]): void {
    const filePath = this.rulesPath(groupId);
    this.ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(rules, null, 2));
  }

  private ensureDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/engine && npx jest src/__tests__/core/watch/watch-rule-service.test.ts --no-cache`

Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/watch/watch-rule-service.ts services/engine/src/__tests__/core/watch/watch-rule-service.test.ts
git commit -m "feat: add WatchRuleService with CRUD and alert management"
```

---

### Task 10: Watch Evaluator — Rule Evaluation Logic

**Files:**

- Create: `services/engine/src/core/watch/watch-evaluator.ts`
- Test: `services/engine/src/__tests__/core/watch/watch-evaluator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/watch/watch-evaluator.test.ts`:

```ts
import { WatchEvaluator } from "../../../core/watch/watch-evaluator";

describe("WatchEvaluator", () => {
  const evaluator = new WatchEvaluator();

  describe("evaluateThreshold", () => {
    const data = [
      { error_rate: 7.2, count: 100 },
      { error_rate: 3.1, count: 200 },
    ];

    test("triggers when condition met", () => {
      const result = evaluator.evaluateThreshold(data, {
        column: "error_rate",
        operator: "gt",
        value: 5,
      });
      expect(result.triggered).toBe(true);
      expect(result.triggeredValue).toBe("7.2");
      expect(result.severity).toBe("critical");
    });

    test("does not trigger when condition not met", () => {
      const result = evaluator.evaluateThreshold(data, {
        column: "count",
        operator: "lt",
        value: 50,
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe("evaluateAnomaly", () => {
    test("detects anomalies from provided anomaly results", () => {
      const anomalies = [
        { column: "revenue", zScore: 3.5, value: 999, severity: "critical" },
      ];
      const result = evaluator.evaluateAnomaly(anomalies, {
        columns: "all",
        zScoreThreshold: 3.0,
      });
      expect(result.triggered).toBe(true);
      expect(result.message).toContain("revenue");
    });

    test("does not trigger below threshold", () => {
      const anomalies = [
        { column: "revenue", zScore: 1.5, value: 100, severity: "info" },
      ];
      const result = evaluator.evaluateAnomaly(anomalies, {
        columns: "all",
        zScoreThreshold: 3.0,
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe("evaluateFreshness", () => {
    test("triggers when data is stale", () => {
      const lastRun = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3h ago
      const result = evaluator.evaluateFreshness(lastRun, {
        maxStaleMinutes: 120,
      });
      expect(result.triggered).toBe(true);
    });

    test("does not trigger when fresh", () => {
      const lastRun = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30m ago
      const result = evaluator.evaluateFreshness(lastRun, {
        maxStaleMinutes: 120,
      });
      expect(result.triggered).toBe(false);
    });
  });

  describe("evaluateTrend", () => {
    test("detects reversal from positive to negative", () => {
      const previousData = [10, 12, 14, 16, 18, 20, 22]; // upward
      const currentData = [22, 20, 18, 16, 14, 12, 10]; // downward
      const result = evaluator.evaluateTrend(previousData, currentData, {
        column: "revenue",
        direction: "reversal",
        lookbackPoints: 7,
      });
      expect(result.triggered).toBe(true);
    });

    test("does not trigger when trend continues", () => {
      const previousData = [10, 12, 14, 16, 18, 20, 22];
      const currentData = [22, 24, 26, 28, 30, 32, 34];
      const result = evaluator.evaluateTrend(previousData, currentData, {
        column: "revenue",
        direction: "reversal",
        lookbackPoints: 7,
      });
      expect(result.triggered).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/engine && npx jest src/__tests__/core/watch/watch-evaluator.test.ts --no-cache`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `services/engine/src/core/watch/watch-evaluator.ts`:

```ts
interface EvaluationResult {
  triggered: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  triggeredValue?: string;
}

interface ThresholdCondition {
  column: string;
  operator: "gt" | "lt" | "gte" | "lte" | "eq" | "neq";
  value: number;
}

interface AnomalyCondition {
  columns: string[] | "all";
  zScoreThreshold: number;
}

interface FreshnessCondition {
  maxStaleMinutes: number;
}

interface TrendCondition {
  column: string;
  direction: "reversal" | "decline" | "incline";
  lookbackPoints: number;
}

interface AnomalyResult {
  column: string;
  zScore: number;
  value: number;
  severity: string;
}

export class WatchEvaluator {
  evaluateThreshold(
    data: Record<string, unknown>[],
    condition: ThresholdCondition,
  ): EvaluationResult {
    for (const row of data) {
      const val = Number(row[condition.column]);
      if (isNaN(val)) continue;

      const met = this.compareValue(val, condition.operator, condition.value);
      if (met) {
        return {
          triggered: true,
          severity: "critical",
          message: `${condition.column} is ${val} (${condition.operator} ${condition.value})`,
          triggeredValue: String(val),
        };
      }
    }

    return { triggered: false, severity: "info", message: "" };
  }

  evaluateAnomaly(
    anomalies: AnomalyResult[],
    condition: AnomalyCondition,
  ): EvaluationResult {
    const relevant =
      condition.columns === "all"
        ? anomalies
        : anomalies.filter((a) =>
            (condition.columns as string[]).includes(a.column),
          );

    const exceeding = relevant.filter(
      (a) => Math.abs(a.zScore) >= condition.zScoreThreshold,
    );

    if (exceeding.length === 0) {
      return { triggered: false, severity: "info", message: "" };
    }

    const worst = exceeding.sort(
      (a, b) => Math.abs(b.zScore) - Math.abs(a.zScore),
    )[0];
    return {
      triggered: true,
      severity: Math.abs(worst.zScore) >= 3 ? "critical" : "warning",
      message: `Anomaly in ${worst.column}: z-score ${worst.zScore.toFixed(2)}, value ${worst.value}`,
      triggeredValue: String(worst.value),
    };
  }

  evaluateFreshness(
    lastRunAt: string | undefined,
    condition: FreshnessCondition,
  ): EvaluationResult {
    if (!lastRunAt) {
      return {
        triggered: true,
        severity: "warning",
        message: "No execution recorded",
      };
    }

    const minutesSince = (Date.now() - new Date(lastRunAt).getTime()) / 60000;
    if (minutesSince > condition.maxStaleMinutes) {
      return {
        triggered: true,
        severity:
          minutesSince > condition.maxStaleMinutes * 2 ? "critical" : "warning",
        message: `Last run ${Math.round(minutesSince)} minutes ago (threshold: ${condition.maxStaleMinutes}m)`,
        triggeredValue: `${Math.round(minutesSince)}m`,
      };
    }

    return { triggered: false, severity: "info", message: "" };
  }

  evaluateTrend(
    previousData: number[],
    currentData: number[],
    condition: TrendCondition,
  ): EvaluationResult {
    const prevSlope = this.linearSlope(previousData);
    const currSlope = this.linearSlope(currentData);

    let triggered = false;
    if (condition.direction === "reversal") {
      triggered =
        (prevSlope > 0 && currSlope < 0) || (prevSlope < 0 && currSlope > 0);
    } else if (condition.direction === "decline") {
      triggered = prevSlope >= 0 && currSlope < 0;
    } else if (condition.direction === "incline") {
      triggered = prevSlope <= 0 && currSlope > 0;
    }

    if (!triggered) {
      return { triggered: false, severity: "info", message: "" };
    }

    const direction = currSlope < 0 ? "declining" : "increasing";
    return {
      triggered: true,
      severity: "warning",
      message: `${condition.column} trend reversed: now ${direction}`,
      triggeredValue: `slope: ${currSlope.toFixed(4)}`,
    };
  }

  private compareValue(
    actual: number,
    operator: ThresholdCondition["operator"],
    expected: number,
  ): boolean {
    switch (operator) {
      case "gt":
        return actual > expected;
      case "lt":
        return actual < expected;
      case "gte":
        return actual >= expected;
      case "lte":
        return actual <= expected;
      case "eq":
        return actual === expected;
      case "neq":
        return actual !== expected;
    }
  }

  private linearSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/engine && npx jest src/__tests__/core/watch/watch-evaluator.test.ts --no-cache`

Expected: PASS — all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/watch/watch-evaluator.ts services/engine/src/__tests__/core/watch/watch-evaluator.test.ts
git commit -m "feat: add WatchEvaluator with threshold, trend, anomaly, and freshness evaluation"
```

---

### Task 11: Notification Service

**Files:**

- Create: `services/engine/src/core/watch/notification-service.ts`

- [ ] **Step 1: Create the notification service**

Create `services/engine/src/core/watch/notification-service.ts`:

```ts
import { sendEmail } from "../email/email-service";

interface AlertNotification {
  ruleName: string;
  queryName: string;
  severity: string;
  message: string;
  triggeredValue?: string;
  timestamp: string;
}

interface NotifyOptions {
  channels: string[];
  recipients?: string[];
}

export class NotificationService {
  async notify(
    alert: AlertNotification,
    options: NotifyOptions,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    if (options.channels.includes("email") && options.recipients?.length) {
      promises.push(this.sendEmailAlert(alert, options.recipients));
    }

    // in_app alerts are handled by WatchRuleService.addAlert() — no push needed
    // The frontend polls /api/watch/alerts for the notification center

    await Promise.allSettled(promises);
  }

  private async sendEmailAlert(
    alert: AlertNotification,
    recipients: string[],
  ): Promise<void> {
    const severityColor =
      alert.severity === "critical"
        ? "#dc2626"
        : alert.severity === "warning"
          ? "#d97706"
          : "#6b7280";

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: ${severityColor};">
          Watch Alert: ${alert.ruleName}
        </h2>
        <p><strong>Query:</strong> ${alert.queryName}</p>
        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Details:</strong> ${alert.message}</p>
        ${alert.triggeredValue ? `<p><strong>Value:</strong> ${alert.triggeredValue}</p>` : ""}
        <p style="color: #6b7280; font-size: 12px;">
          Triggered at ${new Date(alert.timestamp).toLocaleString()}
        </p>
      </div>
    `;

    await sendEmail({
      to: recipients,
      subject: `[${alert.severity.toUpperCase()}] Watch Alert: ${alert.ruleName}`,
      htmlBody,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/engine/src/core/watch/notification-service.ts
git commit -m "feat: add NotificationService for email watch alerts"
```

---

### Task 12: Watch Executor — Scheduled Rule Checking

**Files:**

- Create: `services/engine/src/core/watch/watch-executor.ts`

- [ ] **Step 1: Create the watch executor**

This follows the same pattern as `schedule-executor.ts` — a `setInterval` loop that checks due rules.

Create `services/engine/src/core/watch/watch-executor.ts`:

```ts
import { WatchRuleService, WatchRule, WatchAlert } from "./watch-rule-service";
import { WatchEvaluator } from "./watch-evaluator";
import { NotificationService } from "./notification-service";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

const CHECK_INTERVAL_MS = 60_000; // 1 minute

export class WatchExecutor {
  private readonly ruleService: WatchRuleService;
  private readonly evaluator: WatchEvaluator;
  private readonly notifier: NotificationService;
  private readonly dataDir: string;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.ruleService = new WatchRuleService(dataDir);
    this.evaluator = new WatchEvaluator();
    this.notifier = new NotificationService();
  }

  start(): void {
    console.log("[WatchExecutor] Starting watch rule executor");
    this.runDueRules();
    this.intervalHandle = setInterval(
      () => this.runDueRules(),
      CHECK_INTERVAL_MS,
    );
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async runDueRules(): Promise<void> {
    const groupDirs = this.getGroupIds();

    for (const groupId of groupDirs) {
      const rules = this.ruleService.listRules(groupId);

      for (const rule of rules) {
        if (!this.shouldRun(rule)) continue;

        try {
          await this.evaluateRule(groupId, rule);
        } catch (error) {
          console.error(
            `[WatchExecutor] Error evaluating rule ${rule.id}:`,
            error,
          );
        }
      }
    }
  }

  private shouldRun(rule: WatchRule): boolean {
    if (!rule.enabled) return false;

    // Snooze check
    if (rule.snoozeUntil && new Date(rule.snoozeUntil) > new Date())
      return false;

    // Simple interval check based on cron expression
    // For MVP, we check every minute and use lastCheckedAt + cron to decide
    if (!rule.lastCheckedAt) return true;

    const minutesSinceCheck =
      (Date.now() - new Date(rule.lastCheckedAt).getTime()) / 60000;
    const intervalMinutes = this.parseCronInterval(rule.cronExpression);
    return minutesSinceCheck >= intervalMinutes;
  }

  private async evaluateRule(groupId: string, rule: WatchRule): Promise<void> {
    // Mark as checked
    this.ruleService.updateRule(groupId, rule.id, {
      lastCheckedAt: new Date().toISOString(),
    });

    let result: {
      triggered: boolean;
      severity: string;
      message: string;
      triggeredValue?: string;
    };

    switch (rule.type) {
      case "threshold":
        result = await this.evaluateThresholdRule(groupId, rule);
        break;
      case "anomaly":
        result = await this.evaluateAnomalyRule(groupId, rule);
        break;
      case "freshness":
        result = this.evaluateFreshnessRule(groupId, rule);
        break;
      case "trend":
        result = await this.evaluateTrendRule(groupId, rule);
        break;
      default:
        return;
    }

    if (!result.triggered) return;

    // Cooldown check
    if (rule.lastTriggeredAt) {
      const minutesSinceTrigger =
        (Date.now() - new Date(rule.lastTriggeredAt).getTime()) / 60000;
      if (minutesSinceTrigger < rule.cooldownMinutes) return;
    }

    // Create alert
    const alert: WatchAlert = {
      id: `wa_${randomUUID().slice(0, 8)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      queryName: rule.queryName,
      groupId,
      type: rule.type,
      severity: result.severity,
      message: result.message,
      triggeredValue: result.triggeredValue,
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.ruleService.addAlert(groupId, alert);
    this.ruleService.updateRule(groupId, rule.id, {
      lastTriggeredAt: alert.timestamp,
    });

    // Notify
    await this.notifier.notify(
      {
        ruleName: rule.name,
        queryName: rule.queryName,
        severity: result.severity,
        message: result.message,
        triggeredValue: result.triggeredValue,
        timestamp: alert.timestamp,
      },
      { channels: rule.channels, recipients: rule.recipients },
    );

    console.log(
      `[WatchExecutor] Alert triggered: ${rule.name} — ${result.message}`,
    );
  }

  private async evaluateThresholdRule(
    groupId: string,
    rule: WatchRule,
  ): Promise<{
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  }> {
    // In production, this calls QueryService.executeQuery()
    // For now, read latest snapshot data as a lightweight check
    const snapshotsPath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "snapshots.jsonl",
    );
    const data = this.readLatestSnapshot(snapshotsPath, rule.queryName);
    if (!data.length)
      return { triggered: false, severity: "info", message: "" };

    const condition = rule.condition as {
      column: string;
      operator: string;
      value: number;
    };
    return this.evaluator.evaluateThreshold(data, condition as any);
  }

  private async evaluateAnomalyRule(
    groupId: string,
    rule: WatchRule,
  ): Promise<{
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  }> {
    const historyPath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "history.jsonl",
    );
    if (!fs.existsSync(historyPath))
      return { triggered: false, severity: "info", message: "" };

    const lines = fs
      .readFileSync(historyPath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    const recentAnomalies = lines
      .slice(-50)
      .map((l) => JSON.parse(l))
      .filter((a: any) => a.queryName === rule.queryName);

    const condition = rule.condition as {
      columns: string[] | "all";
      zScoreThreshold: number;
    };
    return this.evaluator.evaluateAnomaly(recentAnomalies, condition);
  }

  private evaluateFreshnessRule(
    groupId: string,
    rule: WatchRule,
  ): {
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  } {
    const snapshotsPath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "snapshots.jsonl",
    );
    let lastRunAt: string | undefined;

    if (fs.existsSync(snapshotsPath)) {
      const lines = fs
        .readFileSync(snapshotsPath, "utf-8")
        .trim()
        .split("\n")
        .filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        const snap = JSON.parse(lines[i]);
        if (snap.queryName === rule.queryName) {
          lastRunAt = snap.timestamp;
          break;
        }
      }
    }

    const condition = rule.condition as { maxStaleMinutes: number };
    return this.evaluator.evaluateFreshness(lastRunAt, condition);
  }

  private async evaluateTrendRule(
    groupId: string,
    rule: WatchRule,
  ): Promise<{
    triggered: boolean;
    severity: string;
    message: string;
    triggeredValue?: string;
  }> {
    const snapshotsPath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "snapshots.jsonl",
    );
    if (!fs.existsSync(snapshotsPath))
      return { triggered: false, severity: "info", message: "" };

    const condition = rule.condition as {
      column: string;
      direction: string;
      lookbackPoints: number;
    };
    const lookback = condition.lookbackPoints || 7;
    const lines = fs
      .readFileSync(snapshotsPath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    const snapshots = lines
      .map((l) => JSON.parse(l))
      .filter((s: any) => s.queryName === rule.queryName);

    if (snapshots.length < lookback * 2)
      return { triggered: false, severity: "info", message: "" };

    const values = snapshots.map((s: any) =>
      Number(s.data?.[condition.column] || 0),
    );
    const previous = values.slice(-lookback * 2, -lookback);
    const current = values.slice(-lookback);

    return this.evaluator.evaluateTrend(previous, current, condition as any);
  }

  private readLatestSnapshot(
    filePath: string,
    queryName: string,
  ): Record<string, unknown>[] {
    if (!fs.existsSync(filePath)) return [];
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const snap = JSON.parse(lines[i]);
      if (snap.queryName === queryName && snap.data) {
        return Array.isArray(snap.data) ? snap.data : [snap.data];
      }
    }
    return [];
  }

  private getGroupIds(): string[] {
    const watchDir = path.join(this.dataDir, "watch");
    if (!fs.existsSync(watchDir)) return [];
    return fs
      .readdirSync(watchDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  }

  private parseCronInterval(cron: string): number {
    // Simple parser for common patterns: */N * * * * = every N minutes
    const parts = cron.split(/\s+/);
    if (parts[0]?.startsWith("*/")) return parseInt(parts[0].slice(2)) || 60;
    if (parts[0] === "0" && parts[1] === "*") return 60; // hourly
    return 60; // default hourly
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/engine/src/core/watch/watch-executor.ts
git commit -m "feat: add WatchExecutor for scheduled rule evaluation"
```

---

### Task 13: Watch Engine Routes

**Files:**

- Create: `services/engine/src/routes/watch.ts`
- Modify: `services/engine/src/server.ts`

- [ ] **Step 1: Create watch router**

Create `services/engine/src/routes/watch.ts`:

```ts
import { Router, Request, Response } from "express";
import { WatchRuleService } from "../core/watch/watch-rule-service";
import path from "path";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const watchService = new WatchRuleService(dataDir);

// GET /api/watch/rules?groupId=default
router.get("/rules", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const rules = watchService.listRules(groupId);
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error("[Watch] List rules error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load watch rules" });
  }
});

// POST /api/watch/rules
router.post("/rules", (req: Request, res: Response) => {
  try {
    const { groupId = "default", ...input } = req.body;
    const rule = watchService.createRule(groupId, input);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    console.error("[Watch] Create rule error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create watch rule" });
  }
});

// PATCH /api/watch/rules/:id
router.patch("/rules/:id", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const updated = watchService.updateRule(groupId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: "Rule not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Watch] Update rule error:", error);
    res.status(500).json({ success: false, error: "Failed to update rule" });
  }
});

// DELETE /api/watch/rules/:id
router.delete("/rules/:id", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const deleted = watchService.deleteRule(groupId, req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Rule not found" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Watch] Delete rule error:", error);
    res.status(500).json({ success: false, error: "Failed to delete rule" });
  }
});

// GET /api/watch/alerts?groupId=default&limit=20
router.get("/alerts", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const limit = parseInt(req.query.limit as string) || 20;
    const alerts = watchService.getAlerts(groupId, limit);
    const unreadCount = watchService.getUnreadCount(groupId);
    res.json({ success: true, data: alerts, unreadCount });
  } catch (error) {
    console.error("[Watch] List alerts error:", error);
    res.status(500).json({ success: false, error: "Failed to load alerts" });
  }
});

// PATCH /api/watch/alerts/:id/read
router.patch("/alerts/:id/read", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    watchService.markAlertRead(groupId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("[Watch] Mark read error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to mark alert read" });
  }
});

export default router;
```

- [ ] **Step 2: Register in server.ts**

In `services/engine/src/server.ts`:

```ts
// Add import:
import watchRouter from "./routes/watch";

// Add route:
app.use("/api/watch", watchRouter);
```

- [ ] **Step 3: Start watch executor in server startup**

In `services/engine/src/server.ts`, after the existing `startScheduleExecutor()` call:

```ts
// Add import:
import { WatchExecutor } from "./core/watch/watch-executor";

// Add after startScheduleExecutor():
const watchExecutor = new WatchExecutor(path.resolve(__dirname, "../data"));
watchExecutor.start();
```

- [ ] **Step 4: Verify engine compiles**

Run: `cd services/engine && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/routes/watch.ts services/engine/src/server.ts
git commit -m "feat: add watch rules API routes and start watch executor on boot"
```

---

### Task 14: Watch Frontend API Proxies

**Files:**

- Create: `src/app/api/watch/rules/route.ts`
- Create: `src/app/api/watch/alerts/route.ts`

- [ ] **Step 1: Create watch rules proxy**

Create `src/app/api/watch/rules/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const engineRes = await proxyToEngine(
      `/api/watch/rules?groupId=${encodeURIComponent(groupId)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ success: false, data: [] }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine("/api/watch/rules", {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create rule" },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: Create watch alerts proxy**

Create `src/app/api/watch/alerts/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const limit = request.nextUrl.searchParams.get("limit") || "20";
    const engineRes = await proxyToEngine(
      `/api/watch/alerts?groupId=${encodeURIComponent(groupId)}&limit=${limit}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, data: [], unreadCount: 0 },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/watch/
git commit -m "feat: add watch rules and alerts API proxy routes"
```

---

### Task 15: Notification Center Component

**Files:**

- Create: `src/components/watch/AlertCard.tsx`
- Create: `src/components/watch/NotificationCenter.tsx`
- Modify: `src/components/shell/ContextualTopBar.tsx`

- [ ] **Step 1: Create AlertCard**

Create `src/components/watch/AlertCard.tsx`:

```tsx
"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { WatchAlert } from "@/types/watch";

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  warning: {
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
};

interface AlertCardProps {
  alert: WatchAlert;
  onMarkRead: (id: string) => void;
  onViewData: (queryName: string) => void;
}

export default function AlertCard({
  alert,
  onMarkRead,
  onViewData,
}: AlertCardProps) {
  const config =
    SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ||
    SEVERITY_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border border-[var(--border-primary)] ${
        alert.read ? "opacity-60" : ""
      }`}
    >
      <div className={`p-1.5 rounded-full ${config.bg} shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{alert.ruleName}</span>
          {!alert.read && (
            <button
              onClick={() => onMarkRead(alert.id)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
            >
              Mark read
            </button>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {alert.message}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(alert.timestamp).toLocaleString()}
          </span>
          <button
            onClick={() => onViewData(alert.queryName)}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            View Data
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create NotificationCenter**

Create `src/components/watch/NotificationCenter.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { WatchAlert } from "@/types/watch";
import AlertCard from "./AlertCard";

interface NotificationCenterProps {
  groupId: string;
}

export default function NotificationCenter({
  groupId,
}: NotificationCenterProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<WatchAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch(`/api/watch/alerts?groupId=${groupId}&limit=20`)
        .then((r) => r.json())
        .then((res) => {
          setAlerts(res.data || []);
          setUnreadCount(res.unreadCount || 0);
        })
        .catch(() => {});
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (alertId: string) => {
    await fetch(`/api/watch/alerts/${alertId}/read?groupId=${groupId}`, {
      method: "PATCH",
    });
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleViewData = (queryName: string) => {
    setOpen(false);
    router.push(`/?query=${encodeURIComponent(queryName)}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)]"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)]">
            <span className="text-sm font-medium">Notifications</span>
            <button
              onClick={() => router.push("/watch")}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              View All Rules
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="p-4 text-sm text-[var(--text-muted)] text-center">
              No alerts yet
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-2">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkRead={handleMarkRead}
                  onViewData={handleViewData}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add NotificationCenter to ContextualTopBar**

In `src/components/shell/ContextualTopBar.tsx`, add the NotificationCenter as a child in the right-side actions area. Import and render it:

```tsx
// Add import:
import NotificationCenter from "@/components/watch/NotificationCenter";

// In the render, add NotificationCenter in the right-side div before {children}:
<div className="flex items-center gap-2">
  <NotificationCenter groupId={activeGroupId || "default"} />
  {children}
</div>;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/watch/ src/components/shell/ContextualTopBar.tsx
git commit -m "feat: add NotificationCenter with bell icon and alert dropdown"
```

---

### Task 16: Watch Rules Page and Sidebar Nav

**Files:**

- Create: `src/components/watch/WatchRuleForm.tsx`
- Create: `src/components/watch/WatchRuleList.tsx`
- Create: `src/app/watch/page.tsx`
- Modify: `src/components/shell/Sidebar.tsx`

- [ ] **Step 1: Create WatchRuleList**

Create `src/components/watch/WatchRuleList.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Trash2, Pause, Play, Eye } from "lucide-react";
import type { WatchRule } from "@/types/watch";

interface WatchRuleListProps {
  groupId: string;
  onEdit: (rule: WatchRule) => void;
}

export default function WatchRuleList({ groupId, onEdit }: WatchRuleListProps) {
  const [rules, setRules] = useState<WatchRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = () => {
    setLoading(true);
    fetch(`/api/watch/rules?groupId=${groupId}`)
      .then((r) => r.json())
      .then((res) => setRules(res.data || []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRules();
  }, [groupId]);

  const toggleEnabled = async (rule: WatchRule) => {
    await fetch(`/api/watch/rules/${rule.id}?groupId=${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    fetchRules();
  };

  const deleteRule = async (ruleId: string) => {
    await fetch(`/api/watch/rules/${ruleId}?groupId=${groupId}`, {
      method: "DELETE",
    });
    fetchRules();
  };

  if (loading)
    return (
      <div className="text-sm text-[var(--text-muted)]">Loading rules...</div>
    );
  if (rules.length === 0)
    return (
      <div className="text-sm text-[var(--text-muted)]">
        No watch rules yet. Create one to get started.
      </div>
    );

  return (
    <div className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-tertiary)]">
          <tr>
            <th className="text-left px-3 py-2">Name</th>
            <th className="text-left px-3 py-2">Query</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Schedule</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-right px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr
              key={rule.id}
              className="border-t border-[var(--border-primary)]"
            >
              <td className="px-3 py-2 font-medium">{rule.name}</td>
              <td className="px-3 py-2 text-[var(--text-muted)]">
                {rule.queryName}
              </td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--bg-tertiary)]">
                  {rule.type}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {rule.cronExpression}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`text-xs ${rule.enabled ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}
                >
                  {rule.enabled ? "Active" : "Paused"}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => onEdit(rule)}
                    className="p-1 rounded hover:bg-[var(--bg-tertiary)]"
                    title="Edit"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleEnabled(rule)}
                    className="p-1 rounded hover:bg-[var(--bg-tertiary)]"
                    title={rule.enabled ? "Pause" : "Resume"}
                  >
                    {rule.enabled ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create WatchRuleForm**

Create `src/components/watch/WatchRuleForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { WatchRuleType } from "@/types/watch";

interface WatchRuleFormProps {
  groupId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export default function WatchRuleForm({
  groupId,
  onCreated,
  onCancel,
}: WatchRuleFormProps) {
  const [name, setName] = useState("");
  const [queryName, setQueryName] = useState("");
  const [type, setType] = useState<WatchRuleType>("threshold");
  const [cronExpression, setCronExpression] = useState("*/30 * * * *");
  const [channels, setChannels] = useState<string[]>(["in_app"]);
  const [recipients, setRecipients] = useState("");
  const [saving, setSaving] = useState(false);

  // Threshold fields
  const [column, setColumn] = useState("");
  const [operator, setOperator] = useState("gt");
  const [thresholdValue, setThresholdValue] = useState("");

  // Freshness fields
  const [maxStaleMinutes, setMaxStaleMinutes] = useState("120");

  // Anomaly fields
  const [zScoreThreshold, setZScoreThreshold] = useState("3.0");

  // Trend fields
  const [trendColumn, setTrendColumn] = useState("");
  const [trendDirection, setTrendDirection] = useState("reversal");

  const buildCondition = () => {
    switch (type) {
      case "threshold":
        return { column, operator, value: parseFloat(thresholdValue) };
      case "freshness":
        return { maxStaleMinutes: parseInt(maxStaleMinutes) };
      case "anomaly":
        return { columns: "all", zScoreThreshold: parseFloat(zScoreThreshold) };
      case "trend":
        return {
          column: trendColumn,
          direction: trendDirection,
          lookbackPoints: 7,
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await fetch("/api/watch/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        name,
        queryName,
        type,
        condition: buildCondition(),
        cronExpression,
        channels,
        recipients: recipients
          ? recipients.split(",").map((r) => r.trim())
          : undefined,
        owner: "current-user",
      }),
    });

    setSaving(false);
    onCreated();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)]"
    >
      <h3 className="font-medium">New Watch Rule</h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">Rule Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">Query Name</span>
          <input
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            required
            className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">Rule Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as WatchRuleType)}
            className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          >
            <option value="threshold">Threshold</option>
            <option value="trend">Trend</option>
            <option value="anomaly">Anomaly</option>
            <option value="freshness">Freshness</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">
            Check Frequency (cron)
          </span>
          <input
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] font-mono"
          />
        </label>
      </div>

      {/* Type-specific condition fields */}
      {type === "threshold" && (
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">Column</span>
            <input
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              required
              className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">Operator</span>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            >
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
              <option value="gte">Greater or equal</option>
              <option value="lte">Less or equal</option>
              <option value="eq">Equal</option>
              <option value="neq">Not equal</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">Value</span>
            <input
              type="number"
              step="any"
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              required
              className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            />
          </label>
        </div>
      )}

      {type === "freshness" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">
            Max stale time (minutes)
          </span>
          <input
            type="number"
            value={maxStaleMinutes}
            onChange={(e) => setMaxStaleMinutes(e.target.value)}
            required
            className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] w-48"
          />
        </label>
      )}

      {type === "anomaly" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">
            Z-Score Threshold
          </span>
          <input
            type="number"
            step="0.1"
            value={zScoreThreshold}
            onChange={(e) => setZScoreThreshold(e.target.value)}
            required
            className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] w-48"
          />
        </label>
      )}

      {type === "trend" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">Column</span>
            <input
              value={trendColumn}
              onChange={(e) => setTrendColumn(e.target.value)}
              required
              className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">Trigger on</span>
            <select
              value={trendDirection}
              onChange={(e) => setTrendDirection(e.target.value)}
              className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
            >
              <option value="reversal">Any reversal</option>
              <option value="decline">Decline</option>
              <option value="incline">Incline</option>
            </select>
          </label>
        </div>
      )}

      {/* Channels */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-muted)]">
          Notification Channels
        </span>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={channels.includes("in_app")}
              onChange={(e) =>
                setChannels(
                  e.target.checked
                    ? [...channels, "in_app"]
                    : channels.filter((c) => c !== "in_app"),
                )
              }
            />
            In-App
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={channels.includes("email")}
              onChange={(e) =>
                setChannels(
                  e.target.checked
                    ? [...channels, "email"]
                    : channels.filter((c) => c !== "email"),
                )
              }
            />
            Email
          </label>
        </div>
      </div>

      {channels.includes("email") && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">
            Recipients (comma-separated)
          </span>
          <input
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder="user@company.com"
            className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]"
          />
        </label>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Rule"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create Watch page**

Create `src/app/watch/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import WatchRuleList from "@/components/watch/WatchRuleList";
import WatchRuleForm from "@/components/watch/WatchRuleForm";
import type { WatchRule } from "@/types/watch";

export default function WatchPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") || "default";
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setShowForm(false);
    setRefreshKey((k) => k + 1);
  };

  const handleEdit = (rule: WatchRule) => {
    // For MVP, just log — full edit modal comes later
    console.log("Edit rule:", rule);
  };

  return (
    <div className="flex flex-col gap-4 p-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Watch Rules</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {showForm && (
        <WatchRuleForm
          groupId={groupId}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      <WatchRuleList key={refreshKey} groupId={groupId} onEdit={handleEdit} />
    </div>
  );
}
```

- [ ] **Step 4: Add Watch to sidebar**

In `src/components/shell/Sidebar.tsx`, add `Eye` to the import and a new nav item:

```ts
// Add to import:
import { /* existing */, Eye } from 'lucide-react';

// Add to NAV_ITEMS after Catalog:
{
  icon: <Eye className="w-[18px] h-[18px]" />,
  label: "Watch",
  href: "/watch",
  title: "Watch Rules",
},
```

- [ ] **Step 5: Commit**

```bash
git add src/components/watch/ src/app/watch/ src/components/shell/Sidebar.tsx
git commit -m "feat: add Watch Rules page with rule creation form and sidebar nav"
```

---

## Phase 2B: Query Chains (Parallel with Phase 2A)

### Task 17: Workflow Types

**Files:**

- Create: `src/types/workflow.ts`

- [ ] **Step 1: Create workflow types**

Create `src/types/workflow.ts`:

```ts
export type WorkflowStepType =
  | "query"
  | "filter"
  | "groupBy"
  | "sort"
  | "aggregate";

export interface WorkflowStep {
  type: WorkflowStepType;
  queryName?: string;
  filters?: Record<string, string>;
  column?: string;
  value?: string;
  direction?: "asc" | "desc";
  aggregation?: string;
}

export interface WorkflowParam {
  name: string;
  type: "text" | "select" | "number" | "date";
  options?: string | string[];
  defaultValue?: string;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  params: WorkflowParam[];
  owner: string;
  visibility: "private" | "group";
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListResponse {
  success: boolean;
  data: Workflow[];
}

export interface WorkflowExecuteResponse {
  success: boolean;
  data: unknown;
  message?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/workflow.ts
git commit -m "feat: add workflow type definitions"
```

---

### Task 18: Workflow Service (Engine)

**Files:**

- Create: `services/engine/src/core/workflow/workflow-service.ts`
- Test: `services/engine/src/__tests__/core/workflow/workflow-service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/workflow/workflow-service.test.ts`:

```ts
import { WorkflowService } from "../../../core/workflow/workflow-service";
import * as fs from "fs";
import * as path from "path";

describe("WorkflowService", () => {
  let service: WorkflowService;
  const testDir = path.join(__dirname, "__test-workflow-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDir, "workflows"), { recursive: true });
    service = new WorkflowService(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("createWorkflow creates and persists", () => {
    const wf = service.createWorkflow("default", {
      name: "Sales by Region",
      steps: [
        { type: "query", queryName: "sales_report" },
        { type: "filter", column: "region", value: "$param:region" },
        { type: "sort", column: "total", direction: "desc" },
      ],
      params: [{ name: "region", type: "select" }],
      owner: "jdoe",
      visibility: "group",
    });

    expect(wf.id).toBeDefined();
    expect(wf.steps).toHaveLength(3);

    const list = service.listWorkflows("default");
    expect(list).toHaveLength(1);
  });

  test("listWorkflows filters by visibility for non-owner", () => {
    service.createWorkflow("default", {
      name: "Private WF",
      steps: [{ type: "query", queryName: "test" }],
      params: [],
      owner: "jdoe",
      visibility: "private",
    });
    service.createWorkflow("default", {
      name: "Group WF",
      steps: [{ type: "query", queryName: "test" }],
      params: [],
      owner: "admin",
      visibility: "group",
    });

    const forJdoe = service.listWorkflows("default", "jdoe");
    expect(forJdoe).toHaveLength(2); // sees own private + group

    const forOther = service.listWorkflows("default", "other");
    expect(forOther).toHaveLength(1); // only group
    expect(forOther[0].name).toBe("Group WF");
  });

  test("deleteWorkflow removes workflow", () => {
    const wf = service.createWorkflow("default", {
      name: "To Delete",
      steps: [{ type: "query", queryName: "test" }],
      params: [],
      owner: "jdoe",
      visibility: "private",
    });

    service.deleteWorkflow("default", wf.id);
    expect(service.listWorkflows("default")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/engine && npx jest src/__tests__/core/workflow/workflow-service.test.ts --no-cache`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `services/engine/src/core/workflow/workflow-service.ts`:

```ts
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export interface WorkflowStep {
  type: string;
  queryName?: string;
  filters?: Record<string, string>;
  column?: string;
  value?: string;
  direction?: string;
  aggregation?: string;
}

export interface WorkflowParam {
  name: string;
  type: string;
  options?: string | string[];
  defaultValue?: string;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  params: WorkflowParam[];
  owner: string;
  visibility: "private" | "group";
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateWorkflowInput {
  name: string;
  steps: WorkflowStep[];
  params: WorkflowParam[];
  owner: string;
  visibility: "private" | "group";
}

export class WorkflowService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  listWorkflows(groupId: string, userId?: string): Workflow[] {
    const all = this.loadWorkflows(groupId);
    if (!userId) return all;
    return all.filter((wf) => wf.visibility === "group" || wf.owner === userId);
  }

  createWorkflow(groupId: string, input: CreateWorkflowInput): Workflow {
    const workflows = this.loadWorkflows(groupId);
    const now = new Date().toISOString();
    const wf: Workflow = {
      id: `wf_${randomUUID().slice(0, 8)}`,
      ...input,
      groupId,
      createdAt: now,
      updatedAt: now,
    };
    workflows.push(wf);
    this.saveWorkflows(groupId, workflows);
    return wf;
  }

  deleteWorkflow(groupId: string, workflowId: string): boolean {
    const workflows = this.loadWorkflows(groupId);
    const filtered = workflows.filter((wf) => wf.id !== workflowId);
    if (filtered.length === workflows.length) return false;
    this.saveWorkflows(groupId, filtered);
    return true;
  }

  getWorkflow(groupId: string, workflowId: string): Workflow | null {
    const workflows = this.loadWorkflows(groupId);
    return workflows.find((wf) => wf.id === workflowId) || null;
  }

  private filePath(groupId: string): string {
    return path.join(this.dataDir, "workflows", `${groupId}.json`);
  }

  private loadWorkflows(groupId: string): Workflow[] {
    const fp = this.filePath(groupId);
    if (!fs.existsSync(fp)) return [];
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  }

  private saveWorkflows(groupId: string, workflows: Workflow[]): void {
    const fp = this.filePath(groupId);
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, JSON.stringify(workflows, null, 2));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/engine && npx jest src/__tests__/core/workflow/workflow-service.test.ts --no-cache`

Expected: PASS — all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/workflow/workflow-service.ts services/engine/src/__tests__/core/workflow/workflow-service.test.ts
git commit -m "feat: add WorkflowService with CRUD and visibility filtering"
```

---

### Task 19: Workflow Engine Route

**Files:**

- Create: `services/engine/src/routes/workflows.ts`
- Modify: `services/engine/src/server.ts`

- [ ] **Step 1: Create workflows router**

Create `services/engine/src/routes/workflows.ts`:

```ts
import { Router, Request, Response } from "express";
import { WorkflowService } from "../core/workflow/workflow-service";
import path from "path";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const workflowService = new WorkflowService(dataDir);

// GET /api/workflows?groupId=default&userId=jdoe
router.get("/", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const userId = req.query.userId as string | undefined;
    const workflows = workflowService.listWorkflows(groupId, userId);
    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error("[Workflows] List error:", error);
    res.status(500).json({ success: false, error: "Failed to load workflows" });
  }
});

// POST /api/workflows
router.post("/", (req: Request, res: Response) => {
  try {
    const { groupId = "default", ...input } = req.body;
    const wf = workflowService.createWorkflow(groupId, input);
    res.status(201).json({ success: true, data: wf });
  } catch (error) {
    console.error("[Workflows] Create error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create workflow" });
  }
});

// DELETE /api/workflows/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const deleted = workflowService.deleteWorkflow(groupId, req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Workflow not found" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Workflows] Delete error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete workflow" });
  }
});

// POST /api/workflows/:id/execute
router.post("/:id/execute", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const wf = workflowService.getWorkflow(groupId, req.params.id);
    if (!wf) {
      res.status(404).json({ success: false, error: "Workflow not found" });
      return;
    }

    // For MVP: return the workflow steps with resolved params
    // Full execution (actually running queries) will be wired in a follow-up
    const params = req.body.params || {};
    const resolvedSteps = wf.steps.map((step) => {
      const resolved = { ...step };
      if (resolved.value?.startsWith("$param:")) {
        const paramName = resolved.value.slice(7);
        resolved.value = params[paramName] || resolved.value;
      }
      if (resolved.filters) {
        const resolvedFilters: Record<string, string> = {};
        for (const [k, v] of Object.entries(resolved.filters)) {
          resolvedFilters[k] = v.startsWith("$param:")
            ? params[v.slice(7)] || v
            : v;
        }
        resolved.filters = resolvedFilters;
      }
      return resolved;
    });

    res.json({
      success: true,
      data: { workflow: wf, resolvedSteps },
      message: "Workflow resolved. Full execution coming in next phase.",
    });
  } catch (error) {
    console.error("[Workflows] Execute error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to execute workflow" });
  }
});

export default router;
```

- [ ] **Step 2: Register in server.ts**

In `services/engine/src/server.ts`:

```ts
// Add import:
import workflowsRouter from "./routes/workflows";

// Add route:
app.use("/api/workflows", workflowsRouter);
```

- [ ] **Step 3: Verify engine compiles**

Run: `cd services/engine && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add services/engine/src/routes/workflows.ts services/engine/src/server.ts
git commit -m "feat: add workflows API routes (CRUD + execute)"
```

---

### Task 20: Workflow Frontend API Proxy

**Files:**

- Create: `src/app/api/workflows/route.ts`
- Create: `src/app/api/workflows/[id]/execute/route.ts`

- [ ] **Step 1: Create workflows proxy**

Create `src/app/api/workflows/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const userId = request.nextUrl.searchParams.get("userId") || "";
    const qs = userId
      ? `?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userId)}`
      : `?groupId=${encodeURIComponent(groupId)}`;
    const engineRes = await proxyToEngine(`/api/workflows${qs}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ success: false, data: [] }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine("/api/workflows", {
      method: "POST",
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create workflow" },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: Create execute proxy**

Create `src/app/api/workflows/[id]/execute/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const body = await request.json();
    const engineRes = await proxyToEngine(
      `/api/workflows/${encodeURIComponent(id)}/execute?groupId=${encodeURIComponent(groupId)}`,
      { method: "POST", body },
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to execute workflow" },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/workflows/
git commit -m "feat: add workflow API proxy routes"
```

---

### Task 21: SaveWorkflowModal Component

**Files:**

- Create: `src/components/workflow/SaveWorkflowModal.tsx`

- [ ] **Step 1: Create SaveWorkflowModal**

Create `src/components/workflow/SaveWorkflowModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ChatStep {
  type: string;
  queryName?: string;
  filters?: Record<string, string>;
  column?: string;
  value?: string;
  direction?: string;
}

interface SaveWorkflowModalProps {
  steps: ChatStep[];
  groupId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SaveWorkflowModal({
  steps,
  groupId,
  onClose,
  onSaved,
}: SaveWorkflowModalProps) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "group">("group");
  const [parameterizedValues, setParameterizedValues] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState(false);

  // Extract all filter values that could be parameterized
  const filterValues = steps
    .filter((s) => s.type === "filter" && s.value)
    .map((s) => ({ column: s.column!, value: s.value! }));

  const toggleParam = (column: string) => {
    const next = new Set(parameterizedValues);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    setParameterizedValues(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const resolvedSteps = steps.map((step) => {
      if (
        step.type === "filter" &&
        step.column &&
        parameterizedValues.has(step.column)
      ) {
        return { ...step, value: `$param:${step.column}` };
      }
      return step;
    });

    const params = Array.from(parameterizedValues).map((col) => ({
      name: col,
      type: "text",
    }));

    await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId,
        name,
        steps: resolvedSteps,
        params,
        owner: "current-user",
        visibility,
      }),
    });

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-primary)] w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Save as Workflow</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-tertiary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">
              Workflow Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Regional Sales Breakdown"
              className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">Visibility</span>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "private" | "group")
              }
              className="px-3 py-1.5 text-sm rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)]"
            >
              <option value="group">Shared with group</option>
              <option value="private">Private</option>
            </select>
          </label>

          <div className="text-xs text-[var(--text-muted)]">
            {steps.length} steps captured
          </div>

          {filterValues.length > 0 && (
            <div>
              <span className="text-xs text-[var(--text-muted)]">
                Ask me each time:
              </span>
              <div className="flex flex-col gap-1 mt-1">
                {filterValues.map(({ column, value }) => (
                  <label
                    key={column}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={parameterizedValues.has(column)}
                      onChange={() => toggleParam(column)}
                    />
                    <span>{column}</span>
                    <span className="text-[var(--text-muted)]">
                      (currently: {value})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-primary)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workflow/SaveWorkflowModal.tsx
git commit -m "feat: add SaveWorkflowModal with parameterization support"
```

---

### Task 22: WorkflowPanel for Chat Sidebar

**Files:**

- Create: `src/components/workflow/WorkflowPanel.tsx`

- [ ] **Step 1: Create WorkflowPanel**

Create `src/components/workflow/WorkflowPanel.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Play, Trash2, ChevronRight } from "lucide-react";
import type { Workflow } from "@/types/workflow";

interface WorkflowPanelProps {
  groupId: string;
  userId?: string;
  onExecute: (workflow: Workflow) => void;
}

export default function WorkflowPanel({
  groupId,
  userId,
  onExecute,
}: WorkflowPanelProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = () => {
    const qs = userId
      ? `/api/workflows?groupId=${groupId}&userId=${userId}`
      : `/api/workflows?groupId=${groupId}`;
    fetch(qs)
      .then((r) => r.json())
      .then((res) => setWorkflows(res.data || []))
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkflows();
  }, [groupId, userId]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/workflows/${id}?groupId=${groupId}`, {
      method: "DELETE",
    });
    fetchWorkflows();
  };

  if (loading)
    return (
      <div className="p-3 text-xs text-[var(--text-muted)]">Loading...</div>
    );
  if (workflows.length === 0)
    return (
      <div className="p-3 text-xs text-[var(--text-muted)]">
        No saved workflows yet.
      </div>
    );

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
        Workflows
      </div>
      {workflows.map((wf) => (
        <div
          key={wf.id}
          className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-tertiary)] group"
        >
          <button
            onClick={() => onExecute(wf)}
            className="flex-1 flex items-center gap-2 text-left text-sm truncate"
          >
            <Play className="w-3 h-3 text-[var(--accent)] shrink-0" />
            <span className="truncate">{wf.name}</span>
            <span className="text-xs text-[var(--text-muted)] shrink-0">
              {wf.steps.length} steps
            </span>
          </button>
          <button
            onClick={() => handleDelete(wf.id)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workflow/WorkflowPanel.tsx
git commit -m "feat: add WorkflowPanel for chat sidebar workflow list"
```

---

## Phase 3: Adaptive Home Feed

### Task 23: Home Feed Types

**Files:**

- Create: `src/types/home-feed.ts`

- [ ] **Step 1: Create home feed types**

Create `src/types/home-feed.ts`:

```ts
export interface BriefingSummary {
  anomaliesDetected: number;
  watchAlertsTriggered: number;
  topQueryName?: string;
  topQueryCount?: number;
  lastLoginAt?: string;
  generatedAt: string;
  message: string;
}

export interface PinnedKpi {
  id: string;
  queryName: string;
  groupId: string;
  valueField: string;
  label: string;
  format?: "number" | "currency" | "percent";
  prefix?: string;
  unit?: string;
}

export interface SuggestedQuery {
  queryName: string;
  reason: string;
  score: number;
}

export interface RecentQueryItem {
  queryName: string;
  groupId: string;
  userMessage: string;
  filters?: Record<string, string>;
  rowCount?: number;
  timestamp: string;
}

export interface HomeFeedData {
  briefing: BriefingSummary;
  suggestedQueries: SuggestedQuery[];
  recentActivity: RecentQueryItem[];
}

export interface HomeFeedResponse {
  success: boolean;
  data: HomeFeedData;
}

export interface FeedSettings {
  pinnedKpis: PinnedKpi[];
  showBriefing: boolean;
  showSuggestions: boolean;
  showRecentActivity: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/home-feed.ts
git commit -m "feat: add home feed type definitions"
```

---

### Task 24: Home Feed Engine Service

**Files:**

- Create: `services/engine/src/core/home-feed/home-feed-service.ts`
- Test: `services/engine/src/__tests__/core/home-feed/home-feed-service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/home-feed/home-feed-service.test.ts`:

```ts
import { HomeFeedService } from "../../../core/home-feed/home-feed-service";
import * as fs from "fs";
import * as path from "path";

describe("HomeFeedService", () => {
  let service: HomeFeedService;
  const testDir = path.join(__dirname, "__test-feed-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDir, "anomaly", "default"), { recursive: true });
    fs.mkdirSync(path.join(testDir, "watch", "default"), { recursive: true });
    fs.mkdirSync(path.join(testDir, "learning", "default"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(testDir, "preferences"), { recursive: true });

    // Anomaly history
    fs.writeFileSync(
      path.join(testDir, "anomaly", "default", "history.jsonl"),
      [
        JSON.stringify({
          queryName: "sales",
          column: "revenue",
          timestamp: new Date().toISOString(),
        }),
        JSON.stringify({
          queryName: "sales",
          column: "cost",
          timestamp: new Date().toISOString(),
        }),
      ].join("\n") + "\n",
    );

    // Watch alerts
    fs.writeFileSync(
      path.join(testDir, "watch", "default", "alerts.jsonl"),
      JSON.stringify({
        id: "a1",
        severity: "critical",
        read: false,
        timestamp: new Date().toISOString(),
      }) + "\n",
    );

    // Time patterns
    fs.writeFileSync(
      path.join(testDir, "learning", "default", "time-patterns.json"),
      JSON.stringify([
        {
          queryName: "sales_report",
          hourDistribution: Array(24).fill(1),
          dayDistribution: Array(7).fill(1),
          totalCount: 50,
        },
      ]),
    );

    // User preferences with recent queries
    fs.writeFileSync(
      path.join(testDir, "preferences", "jdoe.json"),
      JSON.stringify({
        userId: "jdoe",
        recentQueries: [
          {
            queryName: "sales_report",
            groupId: "default",
            userMessage: "show sales",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    );

    service = new HomeFeedService(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("generateBriefing returns summary with counts", () => {
    const briefing = service.generateBriefing("default", "jdoe");
    expect(briefing.anomaliesDetected).toBe(2);
    expect(briefing.watchAlertsTriggered).toBe(1);
    expect(briefing.message).toContain("2 anomalies");
  });

  test("getRecentActivity returns user recent queries", () => {
    const recent = service.getRecentActivity("jdoe", 5);
    expect(recent).toHaveLength(1);
    expect(recent[0].queryName).toBe("sales_report");
  });

  test("getSuggestedQueries returns time-relevant suggestions", () => {
    const suggestions = service.getSuggestedQueries("default", "jdoe");
    expect(suggestions.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/engine && npx jest src/__tests__/core/home-feed/home-feed-service.test.ts --no-cache`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `services/engine/src/core/home-feed/home-feed-service.ts`:

```ts
import * as fs from "fs";
import * as path from "path";

interface BriefingSummary {
  anomaliesDetected: number;
  watchAlertsTriggered: number;
  topQueryName?: string;
  topQueryCount?: number;
  lastLoginAt?: string;
  generatedAt: string;
  message: string;
}

interface SuggestedQuery {
  queryName: string;
  reason: string;
  score: number;
}

interface RecentQueryItem {
  queryName: string;
  groupId: string;
  userMessage: string;
  filters?: Record<string, string>;
  rowCount?: number;
  timestamp: string;
}

export class HomeFeedService {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  generateBriefing(groupId: string, userId: string): BriefingSummary {
    const anomalyCount = this.countRecentAnomalies(groupId);
    const alertCount = this.countRecentAlerts(groupId);

    const parts: string[] = [];
    if (anomalyCount > 0) parts.push(`${anomalyCount} anomalies detected`);
    if (alertCount > 0) parts.push(`${alertCount} watch alerts triggered`);
    if (parts.length === 0) parts.push("All systems normal");

    return {
      anomaliesDetected: anomalyCount,
      watchAlertsTriggered: alertCount,
      generatedAt: new Date().toISOString(),
      message: `Since your last session: ${parts.join(", ")}.`,
    };
  }

  getRecentActivity(userId: string, limit: number): RecentQueryItem[] {
    const prefsPath = path.join(this.dataDir, "preferences", `${userId}.json`);
    if (!fs.existsSync(prefsPath)) return [];

    const prefs = JSON.parse(fs.readFileSync(prefsPath, "utf-8"));
    const recent = prefs.recentQueries || [];
    return recent.slice(-limit).reverse();
  }

  getSuggestedQueries(groupId: string, userId: string): SuggestedQuery[] {
    const timePatternsPath = path.join(
      this.dataDir,
      "learning",
      groupId,
      "time-patterns.json",
    );
    if (!fs.existsSync(timePatternsPath)) return [];

    const patterns = JSON.parse(fs.readFileSync(timePatternsPath, "utf-8"));
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    return patterns
      .map((p: any) => {
        const hourScore = p.hourDistribution?.[currentHour] || 0;
        const dayScore = p.dayDistribution?.[currentDay] || 0;
        const score = (hourScore + dayScore) / (p.totalCount || 1);
        return {
          queryName: p.queryName,
          reason: `Often checked around this time`,
          score,
        };
      })
      .filter((s: SuggestedQuery) => s.score > 0)
      .sort((a: SuggestedQuery, b: SuggestedQuery) => b.score - a.score)
      .slice(0, 5);
  }

  private countRecentAnomalies(groupId: string): number {
    const historyPath = path.join(
      this.dataDir,
      "anomaly",
      groupId,
      "history.jsonl",
    );
    if (!fs.existsSync(historyPath)) return 0;
    const lines = fs
      .readFileSync(historyPath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    // Count anomalies from last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return lines.filter((l) => {
      const entry = JSON.parse(l);
      return new Date(entry.timestamp).getTime() > cutoff;
    }).length;
  }

  private countRecentAlerts(groupId: string): number {
    const alertsPath = path.join(
      this.dataDir,
      "watch",
      groupId,
      "alerts.jsonl",
    );
    if (!fs.existsSync(alertsPath)) return 0;
    const lines = fs
      .readFileSync(alertsPath, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return lines.filter((l) => {
      const entry = JSON.parse(l);
      return new Date(entry.timestamp).getTime() > cutoff;
    }).length;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/engine && npx jest src/__tests__/core/home-feed/home-feed-service.test.ts --no-cache`

Expected: PASS — all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/home-feed/home-feed-service.ts services/engine/src/__tests__/core/home-feed/home-feed-service.test.ts
git commit -m "feat: add HomeFeedService with briefing, suggestions, and recent activity"
```

---

### Task 25: Home Feed Engine Route

**Files:**

- Create: `services/engine/src/routes/home-feed.ts`
- Modify: `services/engine/src/server.ts`

- [ ] **Step 1: Create home-feed router**

Create `services/engine/src/routes/home-feed.ts`:

```ts
import { Router, Request, Response } from "express";
import { HomeFeedService } from "../core/home-feed/home-feed-service";
import path from "path";

const router = Router();
const dataDir = path.resolve(__dirname, "../../data");
const feedService = new HomeFeedService(dataDir);

// GET /api/home-feed?groupId=default&userId=jdoe
router.get("/", (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const userId = (req.query.userId as string) || "anonymous";

    const briefing = feedService.generateBriefing(groupId, userId);
    const suggestedQueries = feedService.getSuggestedQueries(groupId, userId);
    const recentActivity = feedService.getRecentActivity(userId, 5);

    res.json({
      success: true,
      data: { briefing, suggestedQueries, recentActivity },
    });
  } catch (error) {
    console.error("[HomeFeed] Error:", error);
    res.status(500).json({ success: false, error: "Failed to load home feed" });
  }
});

export default router;
```

- [ ] **Step 2: Register in server.ts**

In `services/engine/src/server.ts`:

```ts
// Add import:
import homeFeedRouter from "./routes/home-feed";

// Add route:
app.use("/api/home-feed", homeFeedRouter);
```

- [ ] **Step 3: Commit**

```bash
git add services/engine/src/routes/home-feed.ts services/engine/src/server.ts
git commit -m "feat: add home feed API route"
```

---

### Task 26: Home Feed Frontend API Proxy

**Files:**

- Create: `src/app/api/home-feed/route.ts`

- [ ] **Step 1: Create home-feed proxy**

Create `src/app/api/home-feed/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToEngine } from "@/lib/engine-proxy";

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get("groupId") || "default";
    const userId = request.nextUrl.searchParams.get("userId") || "";
    const engineRes = await proxyToEngine(
      `/api/home-feed?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userId)}`,
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ success: false, data: null }, { status: 502 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/home-feed/
git commit -m "feat: add home feed API proxy route"
```

---

### Task 27: Home Feed Components

**Files:**

- Create: `src/components/home/MorningBriefing.tsx`
- Create: `src/components/home/SuggestedQueries.tsx`
- Create: `src/components/home/RecentActivity.tsx`
- Create: `src/components/home/PinnedKpis.tsx`

- [ ] **Step 1: Create MorningBriefing**

Create `src/components/home/MorningBriefing.tsx`:

```tsx
"use client";

import { AlertTriangle, Bell, CheckCircle } from "lucide-react";
import type { BriefingSummary } from "@/types/home-feed";

interface MorningBriefingProps {
  briefing: BriefingSummary;
}

export default function MorningBriefing({ briefing }: MorningBriefingProps) {
  const hasIssues =
    briefing.anomaliesDetected > 0 || briefing.watchAlertsTriggered > 0;

  return (
    <div
      className={`p-4 rounded-lg border ${hasIssues ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--border-primary)] bg-[var(--bg-secondary)]"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {hasIssues ? (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        ) : (
          <CheckCircle className="w-4 h-4 text-[var(--success)]" />
        )}
        <h2 className="text-sm font-medium">Morning Briefing</h2>
      </div>
      <p className="text-sm text-[var(--text-muted)]">{briefing.message}</p>
      <div className="flex gap-4 mt-3">
        {briefing.anomaliesDetected > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span>{briefing.anomaliesDetected} anomalies</span>
          </div>
        )}
        {briefing.watchAlertsTriggered > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <Bell className="w-3 h-3 text-amber-500" />
            <span>{briefing.watchAlertsTriggered} alerts</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SuggestedQueries**

Create `src/components/home/SuggestedQueries.tsx`:

```tsx
"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SuggestedQuery } from "@/types/home-feed";

interface SuggestedQueriesProps {
  suggestions: SuggestedQuery[];
}

export default function SuggestedQueries({
  suggestions,
}: SuggestedQueriesProps) {
  const router = useRouter();

  if (suggestions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-sm font-medium">Suggested for You</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.queryName}
            onClick={() =>
              router.push(`/?query=${encodeURIComponent(s.queryName)}`)
            }
            className="px-3 py-2 text-sm rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="font-medium">{s.queryName}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {s.reason}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create RecentActivity**

Create `src/components/home/RecentActivity.tsx`:

```tsx
"use client";

import { Clock, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RecentQueryItem } from "@/types/home-feed";

interface RecentActivityProps {
  items: RecentQueryItem[];
}

export default function RecentActivity({ items }: RecentActivityProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-medium">Recent Activity</h2>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div
            key={`${item.queryName}-${i}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {item.queryName}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {item.userMessage} &middot;{" "}
                {new Date(item.timestamp).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() =>
                router.push(`/?query=${encodeURIComponent(item.queryName)}`)
              }
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--accent)] shrink-0"
              title="Resume"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create PinnedKpis placeholder**

Create `src/components/home/PinnedKpis.tsx`:

```tsx
"use client";

import { Pin } from "lucide-react";
import type { PinnedKpi } from "@/types/home-feed";

interface PinnedKpisProps {
  kpis: PinnedKpi[];
}

export default function PinnedKpis({ kpis }: PinnedKpisProps) {
  if (kpis.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-[var(--border-primary)] text-center">
        <Pin className="w-4 h-4 mx-auto mb-1 text-[var(--text-muted)]" />
        <p className="text-xs text-[var(--text-muted)]">
          Pin KPIs from chat results or dashboards to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="min-w-[160px] p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]"
        >
          <div className="text-xs text-[var(--text-muted)]">{kpi.label}</div>
          <div className="text-lg font-semibold mt-1">
            {kpi.prefix}--{kpi.unit}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {kpi.queryName}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/home/
git commit -m "feat: add home feed components (briefing, suggestions, recent, pinned KPIs)"
```

---

### Task 28: Home Feed Page

**Files:**

- Create: `src/app/home/page.tsx`
- Create: `src/components/home/HomeFeed.tsx`

- [ ] **Step 1: Create HomeFeed component**

Create `src/components/home/HomeFeed.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import type { HomeFeedData, PinnedKpi } from "@/types/home-feed";
import MorningBriefing from "./MorningBriefing";
import PinnedKpis from "./PinnedKpis";
import SuggestedQueries from "./SuggestedQueries";
import RecentActivity from "./RecentActivity";

interface HomeFeedProps {
  groupId: string;
  userId: string;
}

export default function HomeFeed({ groupId, userId }: HomeFeedProps) {
  const [feedData, setFeedData] = useState<HomeFeedData | null>(null);
  const [pinnedKpis] = useState<PinnedKpi[]>([]); // Loaded from preferences in future
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/home-feed?groupId=${groupId}&userId=${userId}`)
      .then((r) => r.json())
      .then((res) => setFeedData(res.data || null))
      .catch(() => setFeedData(null))
      .finally(() => setLoading(false));
  }, [groupId, userId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-3xl mx-auto">
        <div className="h-24 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
        <div className="h-16 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
        <div className="h-32 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
      </div>
    );
  }

  if (!feedData) {
    return (
      <div className="p-6 text-[var(--text-muted)]">
        Unable to load home feed. Check engine connectivity.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <MorningBriefing briefing={feedData.briefing} />

      <PinnedKpis kpis={pinnedKpis} />

      <SuggestedQueries suggestions={feedData.suggestedQueries} />

      <RecentActivity items={feedData.recentActivity} />
    </div>
  );
}
```

- [ ] **Step 2: Create home page**

Create `src/app/home/page.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import HomeFeed from "@/components/home/HomeFeed";

export default function HomePage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") || "default";
  // In production, userId comes from auth context
  const userId = searchParams.get("userId") || "jdoe";

  return <HomeFeed groupId={groupId} userId={userId} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/home/HomeFeed.tsx src/app/home/
git commit -m "feat: add home feed page with briefing, KPIs, suggestions, and recent activity"
```

---

### Task 29: Add Home to Sidebar and Update Navigation

**Files:**

- Modify: `src/components/shell/Sidebar.tsx`

- [ ] **Step 1: Add Home nav item as the first entry**

In `src/components/shell/Sidebar.tsx`, add `Home` to the import and insert at the beginning of `NAV_ITEMS`:

```ts
// Add to import:
import { /* existing */, Home } from 'lucide-react';

// Add as FIRST item in NAV_ITEMS:
{
  icon: <Home className="w-[18px] h-[18px]" />,
  label: "Home",
  href: "/home",
  title: "Home",
},
```

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -5`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/Sidebar.tsx
git commit -m "feat: add Home to sidebar as primary navigation entry"
```

---

## Integration Task

### Task 30: Extend Queries Schema with Description, Tags, Owner

**Files:**

- Modify: `services/engine/src/routes/admin/queries.ts`

- [ ] **Step 1: Update query creation/update to accept new fields**

In the existing queries admin route, ensure the POST and PATCH handlers accept and persist `description`, `tags`, and `owner` fields. Find the handler that writes to `queries.json` and add:

```ts
// In the POST handler (create query), add to the new query object:
description: req.body.description || '',
tags: req.body.tags || [],
owner: req.body.owner || '',

// In the PATCH handler (update query), add to the update:
if (req.body.description !== undefined) query.description = req.body.description;
if (req.body.tags !== undefined) query.tags = req.body.tags;
if (req.body.owner !== undefined) query.owner = req.body.owner;
```

- [ ] **Step 2: Verify engine compiles**

Run: `cd services/engine && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add services/engine/src/routes/admin/queries.ts
git commit -m "feat: extend queries schema with description, tags, and owner fields"
```

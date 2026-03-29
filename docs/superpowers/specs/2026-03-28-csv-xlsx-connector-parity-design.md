# CSV/XLSX File Connector Parity - Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Scope:** Bring CSV/XLSX file connector to full parity with SQL connectors (MSSQL/Oracle)
**Approach:** Extend the shared ConnectorDetailPage component to support file-type connectors

---

## 1. Design Decisions

| Decision          | Choice                                                                      | Rationale                                                                                 |
| ----------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Feature scope     | Full SQL connector parity                                                   | Filter params, query builder, save/publish, dashboard placement                           |
| File input method | File path only (server-side)                                                | Keep current behavior, no upload UI needed                                                |
| Query builder     | Multi-step pipeline (SELECT → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT) | Maximum power for data shaping                                                            |
| Page layout       | Same tabbed pattern as SQL connectors (5 tabs)                              | Consistent UX across all connector types                                                  |
| Publish config    | Full config + dashboard placement                                           | Chart type, column roles, filter bindings, drill-down, and direct dashboard card creation |
| Implementation    | Extend shared ConnectorDetailPage                                           | Maximum code reuse, consistent look & feel                                                |

---

## 2. Page Structure

### 2.1 List Page (existing, minor changes)

The current file connector list page (`/admin/connectors/file`) stays mostly as-is. Changes:

- Each source row becomes clickable, linking to a new detail page (`/admin/connectors/file/[id]`)
- Add a "View Details" button or click-to-navigate on each source card
- Keep the inline create form for quick source creation
- Show published query count badge per source

### 2.2 Detail Page (new)

**Route:** `/admin/connectors/file/[id]`

**Breadcrumb:** Admin > Connectors > CSV/XLSX > {source name}

**5 Tabs:**

| Tab           | Purpose                                                    |
| ------------- | ---------------------------------------------------------- |
| File Info     | Source metadata, file validation, column configuration     |
| Schema        | Interactive column browser with type/stats/role assignment |
| Query Builder | Multi-step pipeline to shape data                          |
| Preview       | Execute pipeline, see table + chart results                |
| Saved Queries | Save, configure, publish, and manage queries               |

---

## 3. File Info Tab

### 3.1 File Validation Banner

Top of the tab: a status banner showing file health.

- **Valid (green):** "File validated -- 93 rows, 17 columns, CSV format, Last modified: Mar 28, 2026"
- **Error (red):** "File not found -- check file path" or "Parse error -- invalid CSV at row 42"
- **Warning (amber):** "File changed since last validation -- re-validate recommended"

Validation checks: file exists, parseable, row/column count, last modified date.

### 3.2 Source Details Form

Editable fields matching the current inline form:

| Field          | Type                | Notes                                        |
| -------------- | ------------------- | -------------------------------------------- |
| Source Name    | text                | Unique identifier, used as query name prefix |
| Source Group   | select              | default, finance, etc.                       |
| Description    | textarea            | Free text description                        |
| File Path      | text (monospace)    | Server-side path to CSV/XLSX                 |
| File Type      | toggle (CSV / XLSX) | Auto-detected from extension                 |
| Sheet Name     | text                | XLSX only, disabled for CSV                  |
| Base Directory | text                | Optional override for file resolution        |

### 3.3 Column Configuration

Comma-separated column name inputs for:

- ID Columns
- Date Columns
- Label Columns
- Value Columns
- Ignore Columns

### 3.4 Actions

- **Save Changes** (primary) -- persists source config
- **Re-validate File** (secondary) -- re-reads file, updates row/column counts
- **Delete Source** (danger) -- removes source and all saved queries

---

## 4. Schema Tab

### 4.1 Summary Bar

Horizontal stats: total columns, total rows, numeric column count, string column count, date column count.

### 4.2 Column Table

Interactive table with columns:

| Column         | Description                                                                             |
| -------------- | --------------------------------------------------------------------------------------- |
| Column Name    | The header name from CSV/XLSX                                                           |
| Type           | Auto-detected: string, number, date. Shown as colored badge                             |
| Distinct Count | Number of unique values                                                                 |
| Null Count     | Number of null/empty values                                                             |
| Role           | Dropdown: ID, Label, Value, Date, Ignore, -- (unassigned). Changes update column config |
| Sample Values  | First 3-4 distinct values as pills                                                      |

Role changes in the Schema tab auto-update the Column Configuration in the File Info tab.

---

## 5. Query Builder Tab

### 5.1 Pipeline Architecture

The query builder constructs a pipeline of operations applied sequentially to the CSV/XLSX data. Each step is a card that can be configured independently.

**Pipeline steps (in order):**

1. **SELECT** -- choose which columns to include
2. **WHERE** -- filter rows by conditions
3. **GROUP BY** -- group rows and apply aggregations
4. **HAVING** -- filter grouped results
5. **ORDER BY** -- sort results
6. **LIMIT** -- cap result count

### 5.2 Step Bar

Horizontal bar at top showing all 6 steps as clickable pills:

- **Active step:** brand background, white text
- **Configured step:** brand-subtle background, brand text
- **Unconfigured step:** gray background, muted text

Clicking a step scrolls to / focuses that step's configuration card.

### 5.3 Column Picker (Left Panel)

Fixed 200px left panel:

- Search input to filter columns by name
- Checkbox list of all columns
- Checked columns are included in SELECT
- Click a column to add it to the current step

### 5.4 Step Configuration Cards (Right Panel)

**SELECT Card:**

- Shows selected columns as brand-colored pills with X to remove
- "Select All" button
- Column order can be rearranged (drag or up/down arrows)

**WHERE Card:**

- List of filter conditions, each with:
  - Column dropdown (from selected columns)
  - Operator dropdown: equals, not equals, contains, starts with, ends with, greater than, less than, between, in, is null, is not null
  - Value input (text, or multi-value for "in" operator)
  - AND/OR toggle between conditions
  - X to remove condition
- "+ Add Condition" button

**GROUP BY Card:**

- Group column dropdown (single or multi-column)
- Aggregation configuration per numeric column:
  - Column name + operation dropdown (SUM, AVG, COUNT, MIN, MAX)
  - Multiple aggregations per column supported
  - COUNT(\*) always available
- "+ Add Aggregation" button

**HAVING Card:**

- Same UI as WHERE but operates on aggregated columns
- Column dropdown shows aggregated column names (e.g., "SUM(DurationAvg)")
- Same operators as WHERE

**ORDER BY Card:**

- Column dropdown + ASC/DESC toggle
- Multiple sort columns supported (drag to reorder priority)
- "+ Add Sort" button

**LIMIT Card:**

- Number input, default 100
- Set 0 for unlimited

### 5.5 Actions

- **Run Preview** (primary) -- executes the pipeline, switches to Preview tab
- **Reset Pipeline** (secondary) -- clears all steps

---

## 6. Preview Tab

### 6.1 Execution Info Bar

Shows after running:

- Execution time badge (green pill)
- Result summary: row count, source row count, applied filters description
- Export CSV button
- Table/Chart toggle

### 6.2 Chart View

Uses the existing `DataChart` component (Recharts):

- Auto-detects chart type from data shape
- Shows chart type selector (Bar, Line, Pie, etc.)
- Renders visualization of the query results

### 6.3 Table View

Standard data table:

- Column headers (sortable by click)
- Paginated rows (25 per page)
- Hover row highlight

### 6.4 Table + Chart (Auto Mode)

Default shows both chart above and table below, like the existing dashboard card auto mode.

---

## 7. Saved Queries Tab

### 7.1 Query List (Left Panel)

220px panel showing all saved queries for this file source:

- Each entry: query name, one-line description, status badge (Published / Draft)
- Click to load query config in the right panel
- "+ Save Current Query" button at bottom

### 7.2 Query Config (Right Panel)

**Query Details Section:**

- Query name (text, required)
- Display group (select: default, finance, etc.)
- Description (text)

**Chart Configuration Section:**

- Default chart type: Bar / Line / Pie / Table (toggle buttons)
- Label column dropdown (from query result columns)
- Value column(s) multi-select

**Filter Parameters Section:**
Each filter row:

- Column name (from query columns)
- Binding type: column (in-memory filter), query_param, path, body
- Input type: select, multi_select, text, date_range, number_range, boolean, search
- X to remove
- "+ Add Filter" button

**Drill-Down Targets Section:**
Each drill-down row:

- Source column (click this column in the rendered table)
- Target query (dropdown of all published queries)
- Target filter key (which filter on the target query receives the clicked value)
- "+ Add Target" button

### 7.3 Actions

- **Publish to Engine** (primary) -- registers the query with the engine service, making it available in chat and dashboards
- **Save as Draft** (secondary) -- saves locally without publishing
- **Add to Dashboard** (success) -- opens modal to place on a dashboard

---

## 8. Add to Dashboard Modal

Triggered from the "Add to Dashboard" button after publishing.

**Fields:**

- Dashboard (dropdown of user's dashboards)
- Card Title (text, pre-filled with query name)
- Display Mode (select: Auto / Table only / Chart only)
- Auto-run on Load (toggle: Yes / No)

**Actions:**

- Cancel -- closes modal
- Add Card -- creates a new card on the selected dashboard with the published query

---

## 9. Backend API Requirements

### 9.1 Existing Endpoints (reuse)

| Endpoint                                    | Purpose                              |
| ------------------------------------------- | ------------------------------------ |
| `GET /api/data/schema/:queryName`           | Column metadata (already exists)     |
| `GET /api/data/distinct/:queryName/:column` | Distinct values for filter dropdowns |
| `POST /api/queries/execute`                 | Query execution                      |
| `GET /api/queries`                          | Query registry                       |

### 9.2 New/Modified Endpoints

| Endpoint                                                | Method | Purpose                                                 |
| ------------------------------------------------------- | ------ | ------------------------------------------------------- |
| `GET /api/admin/file-sources`                           | GET    | List all file sources                                   |
| `GET /api/admin/file-sources/:id`                       | GET    | Get single file source with schema                      |
| `PUT /api/admin/file-sources/:id`                       | PUT    | Update file source config                               |
| `POST /api/admin/file-sources/:id/validate`             | POST   | Re-validate file (check exists, parse, count rows/cols) |
| `POST /api/admin/file-sources/:id/preview`              | POST   | Execute query pipeline, return results                  |
| `GET /api/admin/file-sources/:id/queries`               | GET    | List saved queries for this source                      |
| `POST /api/admin/file-sources/:id/queries`              | POST   | Save a new query (draft or published)                   |
| `PUT /api/admin/file-sources/:id/queries/:qid`          | PUT    | Update saved query                                      |
| `DELETE /api/admin/file-sources/:id/queries/:qid`       | DELETE | Delete saved query                                      |
| `POST /api/admin/file-sources/:id/queries/:qid/publish` | POST   | Publish query to engine                                 |

### 9.3 Query Pipeline Payload

The preview and save endpoints accept a pipeline object:

```typescript
interface QueryPipeline {
  select: string[]; // column names to include
  where?: FilterCondition[]; // row filter conditions
  groupBy?: {
    columns: string[]; // group columns
    aggregations: Aggregation[]; // per-column aggregations
  };
  having?: FilterCondition[]; // grouped result filters
  orderBy?: { column: string; dir: "asc" | "desc" }[];
  limit?: number; // 0 = unlimited
}

interface FilterCondition {
  column: string;
  operator:
    | "eq"
    | "neq"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "between"
    | "in"
    | "is_null"
    | "is_not_null";
  value: string | number | string[]; // array for "in" and "between"
  logic?: "and" | "or"; // connector to next condition
}

interface Aggregation {
  column: string;
  operation: "sum" | "avg" | "count" | "min" | "max";
}
```

---

## 10. Implementation Strategy

### Phase 1: Detail Page Shell + File Info + Schema Tabs

1. Create `/admin/connectors/file/[id]/page.tsx` with tabbed layout
2. Implement File Info tab (form + validation banner)
3. Implement Schema tab (column table with role dropdowns)
4. Add navigation from list page to detail page

### Phase 2: Query Builder Tab

5. Build pipeline step bar component
6. Build column picker (left panel)
7. Build SELECT step card
8. Build WHERE step card (condition builder)
9. Build GROUP BY step card (aggregation config)
10. Build HAVING, ORDER BY, LIMIT step cards

### Phase 3: Preview Tab

11. Build preview execution (POST pipeline to backend)
12. Build table + chart result display
13. Wire "Run Preview" from query builder to preview tab

### Phase 4: Save & Publish Flow

14. Build saved queries list panel
15. Build query config form (name, chart, filters, drill-down)
16. Build publish-to-engine action
17. Build "Add to Dashboard" modal

### Phase 5: Backend

18. Add file validation endpoint
19. Add pipeline preview endpoint (extends csv-analyzer)
20. Add saved queries CRUD endpoints
21. Add publish-to-engine endpoint

---

## 11. Files to Create / Modify

### New Files

- `src/app/admin/connectors/file/[id]/page.tsx` -- detail page with 5 tabs
- `src/components/admin/file-connector/FileInfoTab.tsx` -- file info + validation
- `src/components/admin/file-connector/SchemaTab.tsx` -- column browser
- `src/components/admin/file-connector/QueryBuilderTab.tsx` -- pipeline builder
- `src/components/admin/file-connector/PreviewTab.tsx` -- query results
- `src/components/admin/file-connector/SavedQueriesTab.tsx` -- save/publish/manage
- `src/components/admin/file-connector/PipelineStepBar.tsx` -- step navigation
- `src/components/admin/file-connector/ColumnPicker.tsx` -- left panel column selector
- `src/components/admin/file-connector/ConditionBuilder.tsx` -- WHERE/HAVING conditions
- `src/components/admin/file-connector/AggregationConfig.tsx` -- GROUP BY aggregations
- `src/components/admin/file-connector/AddToDashboardModal.tsx` -- dashboard placement
- `services/engine/src/routes/admin/file-sources.ts` -- backend API routes

### Modified Files

- `src/app/admin/connectors/file/page.tsx` -- add click-to-navigate to detail page
- `services/engine/src/server.ts` -- register new file-sources routes
- `services/engine/src/core/api-connector/csv-analyzer.ts` -- extend with pipeline execution

---

## 12. Out of Scope

- File upload UI (path-only for now)
- Real-time file watching / auto-refresh on file change
- Multi-file joins (combine multiple CSV files)
- Custom column type overrides (auto-detection only)
- SQL expression support in WHERE conditions

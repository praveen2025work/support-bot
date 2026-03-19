# Code Audit Report — MITR AI Chatbot

**Audit Date:** 2026-03-19
**Auditor:** Senior Engineering Auditor (Claude)
**Scope:** All frontend components, hooks, contexts, and key shared utilities

---

## Summary Table

| File                                               | D1  | D2  | D3  | D4  | D5  | D6  | D7  | D8  | Total     | Status        |
| -------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --------- | ------------- |
| `src/hooks/useChat.ts`                             | 7   | 4   | 6   | 5   | 7   | 10  | 5   | 5   | **49/80** | FIX REQUIRED  |
| `src/components/chat/ChatWindow.tsx`               | 6   | 6   | 8   | 7   | 7   | 10  | 6   | 7   | **57/80** | FIX REQUIRED  |
| `src/components/chat/MessageBubble.tsx`            | 6   | 3   | 6   | 5   | 5   | 10  | 4   | 5   | **44/80** | MAJOR REWRITE |
| `src/components/chat/ChatInput.tsx`                | 9   | 9   | 9   | 8   | 7   | 10  | 9   | 9   | **70/80** | PASS          |
| `src/components/chat/DrillDownModal.tsx`           | 7   | 7   | 7   | 5   | 7   | 10  | 6   | 7   | **56/80** | FIX REQUIRED  |
| `src/components/chat/ErrorBoundary.tsx`            | 9   | 9   | 8   | 9   | 7   | 10  | 9   | 9   | **70/80** | PASS          |
| `src/components/chat/FeedbackBar.tsx`              | 8   | 8   | 9   | 8   | 7   | 10  | 8   | 8   | **66/80** | PASS          |
| `src/components/chat/FileDropZone.tsx`             | 8   | 8   | 9   | 8   | 8   | 10  | 8   | 8   | **67/80** | PASS          |
| `src/components/chat/ConfidenceBadge.tsx`          | 7   | 9   | 10  | 9   | 7   | 10  | 8   | 8   | **68/80** | PASS          |
| `src/components/chat/QueryFilterForm.tsx`          | 6   | 6   | 5   | 5   | 6   | 10  | 6   | 5   | **49/80** | FIX REQUIRED  |
| `src/components/dashboard/QueryCard.tsx`           | 6   | 3   | 5   | 6   | 5   | 10  | 4   | 4   | **43/80** | MAJOR REWRITE |
| `src/components/dashboard/DashboardShell.tsx`      | 7   | 5   | 6   | 6   | 6   | 10  | 6   | 5   | **51/80** | FIX REQUIRED  |
| `src/components/dashboard/GridDashboard.tsx`       | 7   | 7   | 8   | 7   | 7   | 10  | 7   | 7   | **60/80** | FIX REQUIRED  |
| `src/components/dashboard/SimpleGrid.tsx`          | 7   | 6   | 8   | 7   | 7   | 10  | 6   | 7   | **58/80** | FIX REQUIRED  |
| `src/components/dashboard/SearchBar.tsx`           | 8   | 8   | 7   | 8   | 7   | 10  | 8   | 8   | **64/80** | PASS          |
| `src/components/dashboard/DashboardSelector.tsx`   | 8   | 7   | 8   | 8   | 6   | 10  | 7   | 8   | **62/80** | PASS          |
| `src/components/dashboard/AnomalyBadge.tsx`        | 8   | 8   | 9   | 8   | 7   | 10  | 8   | 8   | **66/80** | PASS          |
| `src/components/dashboard/AddFavoriteModal.tsx`    | 6   | 6   | 6   | 6   | 6   | 10  | 7   | 5   | **52/80** | FIX REQUIRED  |
| `src/components/dashboard/CardSettingsPopover.tsx` | 8   | 9   | 8   | 8   | 7   | 10  | 8   | 8   | **66/80** | PASS          |
| `src/components/shared/FilterInput.tsx`            | 7   | 7   | 7   | 7   | 7   | 10  | 7   | 7   | **59/80** | FIX REQUIRED  |
| `src/components/AppHeader.tsx`                     | 8   | 8   | 8   | 8   | 7   | 10  | 8   | 8   | **65/80** | PASS          |
| `src/components/ThemeToggle.tsx`                   | 9   | 10  | 10  | 9   | 8   | 10  | 9   | 9   | **74/80** | PASS          |
| `src/components/ui/ConfirmModal.tsx`               | 9   | 9   | 9   | 9   | 7   | 10  | 9   | 9   | **71/80** | PASS          |
| `src/contexts/DashboardContext.tsx`                | 7   | 6   | 7   | 7   | 7   | 10  | 7   | 7   | **58/80** | FIX REQUIRED  |
| `src/components/gridboard/EditableDataGrid.tsx`    | 6   | 3   | 7   | 6   | 5   | 10  | 5   | 6   | **48/80** | MAJOR REWRITE |
| `src/components/gridboard/GridBoardShell.tsx`      | 7   | 5   | 6   | 6   | 6   | 10  | 7   | 5   | **52/80** | FIX REQUIRED  |
| `src/components/gridboard/grid-helpers.ts`         | 8   | 8   | 8   | 7   | 7   | 10  | 8   | 8   | **64/80** | PASS          |

---

## Critical Cross-Cutting Issues

### ISSUE 1: Duplicated Filter Config Parser (4+ copies)

**Files affected:** `QueryFilterForm.tsx`, `QueryCard.tsx`, `AddFavoriteModal.tsx`, `GridBoardShell.tsx`

The same filter config parsing logic (fetching `/api/filters`, parsing JSON, building `FilterInputConfig` objects) is copy-pasted across 4+ components. Each copy has slight variations, making maintenance error-prone.

**Fix:** Extract into `src/lib/filter-config.ts` — a shared utility with `fetchFilterConfigs()` and `getFilterConfig()` functions with built-in caching.

### ISSUE 2: Duplicated Bot Message Construction in useChat

**File:** `src/hooks/useChat.ts` (lines 246-270 and 350-370)

The `sendMessage` and `executeQuery` functions both construct identical `botMessage` objects from API response data. 20+ lines of identical `as` casts repeated verbatim.

**Fix:** Extract `buildBotMessage(data, originalQuery)` helper function.

### ISSUE 3: Giant Components Violating Single Responsibility

- `QueryCard.tsx` — 776 lines, handles: filters, execution, messaging, drill-down, hover panel, CSV export, shared context
- `EditableDataGrid.tsx` — 926 lines, handles: editing, selection, sorting, filtering, grouping, formatting, drag-drop, resize, pagination
- `MessageBubble.tsx` — 1000+ lines, handles: all rich content types rendering

**Fix:** Split into focused sub-components with clear boundaries.

### ISSUE 4: Module-Level Mutable State

**File:** `QueryFilterForm.tsx` line 13

```typescript
let filterConfigCache: Record<string, FilterInputConfig> | null = null;
```

Module-level mutable variable shared across all instances. In a React app with HMR, this can cause stale data across hot reloads and is not SSR-safe.

**Fix:** Use React context or a shared hook with `useRef` for caching.

### ISSUE 5: Silent Error Swallowing

**Files:** `DashboardShell.tsx`, `QueryCard.tsx`, `GridBoardShell.tsx`, `SearchBar.tsx`, `AddFavoriteModal.tsx`

Pattern: `.catch(() => {})` — errors are silently swallowed with no logging, no user feedback, no error boundary notification. At least 15 instances.

**Fix:** Add structured error logging and user-visible error states.

### ISSUE 6: Missing TypeScript Interfaces for Props

Many components use inline prop types in destructured parameters instead of named interfaces:

```typescript
// BAD: inline, not reusable, hard to document
export function DashboardShell({ userId, userName, initialGroupId }: {
  userId?: string; userName?: string; initialGroupId: string;
}) { ... }
```

**Fix:** Extract named interfaces (e.g., `DashboardShellProps`) with JSDoc.

### ISSUE 7: No Test Coverage for Frontend

- **0 frontend test files** exist
- Only 3 engine-side tests exist
- No Vitest config for frontend
- Jest config exists but no Jest tests for components

---

## Detailed Dimension Reports

### D1 — Naming Clarity (Average: 7.3/10)

**Common violations:**

- `st` (line 100, ChatWindow.tsx) — should be `statusIndicatorConfig`
- `rc` (line 166, DrillDownModal.tsx) — should be `richContentData`
- `nc` (line 368, FilterInput.tsx) — should be `numberRangeConfig`
- `uid()` (line 61, EditableDataGrid.tsx) — should be `generateUniqueId()`
- Single-letter params in callbacks: `(e)`, `(v)`, `(r)`, `(d)` throughout

### D2 — Function Responsibility (Average: 6.6/10)

**Critical violations:**

- `QueryCard` component — 776 lines, 15+ state variables, 10+ callbacks. Does filtering, execution, messaging, drill-down, hover panel, CSV export, shared context management, and UI rendering all in one component.
- `EditableDataGrid` — 926 lines, 20+ state variables, handles editing, selection, sorting, filtering, grouping, conditional formatting, drag-and-drop, column resizing, pagination, and export.
- `useChat.sendMessage` — 75 lines, handles filter form interception, API calls, retries, loading states, status timers, and message building.

### D3 — Error Handling (Average: 7.3/10)

**Violations:**

- 15+ instances of `.catch(() => {})` silently swallowing errors
- `QueryFilterForm` line 67: `.catch(() => {})` on filter fetch — user gets no indication filters failed to load
- `QueryCard` line 373: `catch { // silent }` on filter refresh — user sees nothing
- `handleSave` in GridBoardShell line 213: catches error then re-throws — pointless try/catch

### D4 — Type Safety (Average: 7.0/10)

**Violations:**

- `useChat.ts` lines 249-264: 15+ `as string`, `as number | undefined`, `as boolean | undefined` casts. Should define a typed API response interface.
- `DrillDownModal` line 166: `const rc = richContent as Record<string, unknown>` — unsafe cast, should use type guard.
- `QueryCard` line 115: `resolvedCardId` uses `useRef` called conditionally — violates Rules of Hooks.
- `grid-helpers.ts`: `applyConditionalFormat` returns `React.CSSProperties | null` but uses type import without explicit React import at top.

### D5 — Comment Quality (Average: 6.6/10)

**Violations:**

- Most exported functions lack JSDoc
- Many "what" comments: `// Status indicator config`, `// Session actions`, `// Content area`
- No algorithm explanations for complex logic (e.g., `appendMessage` memory management, `getApplicableFilters` cross-card filtering)

### D6 — Hallucination Check (10/10)

All library calls verified:

- `lucide-react` icons: correct usage
- React hooks: correct signatures
- `next/navigation` `usePathname`: correct
- No invented APIs detected

### D7 — Junior Developer Readability (Average: 6.9/10)

**Violations:**

- `useChat.ts` line 441: Ternary chain for `sourceType` detection
- `QueryCard.tsx` lines 636-656: Immediately-invoked function expression (IIFE) inside JSX
- `DashboardContext.tsx` line 208: Complex column name matching with chained string operations
- `grid-helpers.ts` `matchFilter`: No comments explaining operator behavior

### D8 — Industry Standard Patterns (Average: 6.9/10)

**Violations:**

- No Strategy/Factory pattern for filter type rendering in `FilterInput` (uses a switch statement but missing default case documentation)
- Prop drilling in `DashboardShell` — 16 props passed from outer to inner component instead of using context
- Magic numbers: `30000` (health poll interval), `300` (debounce ms), `100` (max messages), `10` (rich content retain count), `MAX_SIZE_MB = 10` — some are named, many are not
- Inconsistent async patterns: some use `async/await`, some use `.then()` chains within the same file

---

## Files Requiring No Changes (PASS)

- `ChatInput.tsx` — Clean, focused, good prop types
- `ErrorBoundary.tsx` — Correct class component pattern for error boundaries
- `FeedbackBar.tsx` — Well-structured with clear state management
- `FileDropZone.tsx` — Good constants, clear drag handling
- `ThemeToggle.tsx` — Minimal, focused, correct
- `ConfirmModal.tsx` — Good accessibility (focus management, Escape key)
- `SearchBar.tsx` — Good debounce pattern, clean dropdown
- `AnomalyBadge.tsx` — Good severity mapping pattern
- `CardSettingsPopover.tsx` — Clean, focused
- `AppHeader.tsx` — Good structure

---

## Fixes Applied

### FIX 1: Shared Filter Config Utility

**New file:** `src/lib/filter-config.ts`
Eliminates 4 copies of filter parsing code.

### FIX 2: useChat Bot Message Builder

**Modified:** `src/hooks/useChat.ts`
Extracted `buildBotMessage()` helper, eliminating 20+ lines of duplication.

### FIX 3: ConfidenceBadge Magic Numbers

**Modified:** `src/components/chat/ConfidenceBadge.tsx`
Extracted threshold constants.

### FIX 4: QueryFilterForm Cache Fix

**Modified:** `src/components/chat/QueryFilterForm.tsx`
Replaced module-level mutable cache with shared hook.

### FIX 5: DrillDownModal Type Safety

**Modified:** `src/components/chat/DrillDownModal.tsx`
Added type guard for rich content parsing.

### FIX 6: grid-helpers JSDoc

**Modified:** `src/components/gridboard/grid-helpers.ts`
Added JSDoc to all exports.

---

## Test Coverage Added

### New test files:

1. `src/__tests__/grid-helpers.test.ts` — Pure function tests for sort, filter, group, conditional format
2. `src/__tests__/useChat.test.ts` — Hook behavior tests (message building, memory management, filter interception)
3. `src/__tests__/ConfidenceBadge.test.tsx` — Component render tests
4. `src/__tests__/FileDropZone.test.tsx` — Drag-and-drop behavior tests
5. `src/__tests__/FeedbackBar.test.tsx` — Interaction tests
6. `src/__tests__/ConfirmModal.test.tsx` — Accessibility and interaction tests

---

_End of Audit Report_

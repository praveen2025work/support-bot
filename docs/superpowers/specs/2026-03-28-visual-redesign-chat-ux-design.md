# Visual Redesign & Chat UX - Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Scope:** Sub-project 1 of platform redesign -- visual overhaul + chat UX
**Approach:** Page-by-page reskin (top-down), starting with Chat, then Dashboard

---

## 1. Design Decisions

| Decision       | Choice                                                    | Rationale                                                                      |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Target persona | All tiers (analyst, manager, executive)                   | Platform product serving diverse roles                                         |
| Navigation     | Collapsible icon sidebar + contextual top bar             | Maximizes data real estate, modern SaaS pattern                                |
| Aesthetic      | Polished Enterprise (Stripe/Retool/Figma)                 | Professional, layered cards, soft gradients -- not boring                      |
| Chat layout    | Split view (narrow chat left, wide data right)            | Data-heavy product needs full-width visualization                              |
| Idle state     | Pinned query mini-dashboard in data panel                 | Right panel is never wasted space                                              |
| Theming        | Brand-customizable (deployment) + preset themes (user)    | Multi-tenant platform needs brand injection + user preference                  |
| View modes     | Progressive disclosure (default) + Presentation mode (TV) | Clean by default, controls on hover; separate full-screen mode for big screens |

---

## 2. App Shell & Navigation

### 2.1 Icon Sidebar (48px collapsed)

- **Position:** Fixed left, full viewport height
- **Collapsed state (default):** 48px wide, icons only
- **Expanded state (hover):** 200px wide, icons + labels
  - Expands with 200ms slide-right animation
  - Collapses after 300ms delay when mouse leaves
  - Pin icon to lock open (persisted in user preferences)
  - Expanded sidebar overlays content (no layout shift), with subtle shadow
- **Layout:**
  - Top: Logo/brand icon (configurable)
  - Middle: Navigation icons -- Chat, Dashboard, Grid Board, Data Explorer
  - Separator line
  - Bottom: Admin (if admin role), Settings, User avatar
- **Active state:** Brand background + brand text color on active nav item
- **App name:** Visible only when sidebar is expanded

### 2.2 Contextual Top Bar

- **Position:** Fixed top, to the right of sidebar
- **Height:** ~44px single row
- **Content varies by page:**
  - **Always present:** Page title, group selector dropdown
  - **Chat page:** Active query indicator pill, Cmd+K search hint
  - **Dashboard page:** Dashboard selector dropdown, filter pills, Edit button
  - **Data Explorer:** Source selector, column filter controls
  - **Admin:** Section breadcrumb
- **Filter display:** Active filters shown as compact pills with remove (x) buttons + "+ Filter" button
- **Search:** Cmd+K global keyboard shortcut opens command palette

---

## 3. Design Tokens

### 3.1 Color System

Semantic tokens that adapt per theme. The `brand` color is configurable at deployment level.

**Light Theme (Default):**

| Token            | Value                    | Usage                                        |
| ---------------- | ------------------------ | -------------------------------------------- |
| `bg-primary`     | `#ffffff`                | Page background, cards                       |
| `bg-secondary`   | `#f8fafc`                | Sidebar, panels, subtle backgrounds          |
| `bg-tertiary`    | `#f1f5f9`                | Input backgrounds, table headers             |
| `text-primary`   | `#1e293b`                | Headings, primary content                    |
| `text-secondary` | `#475569`                | Body text, descriptions                      |
| `text-muted`     | `#94a3b8`                | Captions, meta text, placeholders            |
| `brand`          | `#6366f1` (configurable) | Primary actions, active states, links        |
| `brand-subtle`   | `#eef2ff`                | Brand tinted backgrounds, hover states       |
| `success`        | `#059669`                | Positive values, active status               |
| `danger`         | `#dc2626`                | Errors, negative values, destructive actions |
| `warning`        | `#d97706`                | Anomalies, review states                     |
| `border`         | `#e2e8f0`                | Card borders, dividers, input borders        |

**Dark Theme:**

| Token            | Value                                            | Usage                            |
| ---------------- | ------------------------------------------------ | -------------------------------- |
| `bg-primary`     | `#0f172a`                                        | Page background                  |
| `bg-secondary`   | `#1e293b`                                        | Cards, sidebar                   |
| `bg-tertiary`    | `#334155`                                        | Input backgrounds, table headers |
| `text-primary`   | `#f1f5f9`                                        | Headings, primary content        |
| `text-secondary` | `#cbd5e1`                                        | Body text                        |
| `text-muted`     | `#64748b`                                        | Captions, meta                   |
| `brand`          | `#818cf8` (auto-lightened from deployment brand) | Primary actions                  |
| `brand-subtle`   | `rgba(99,102,241,0.15)`                          | Brand tinted backgrounds         |
| `success`        | `#10b981`                                        | Positive values                  |
| `danger`         | `#ef4444`                                        | Errors, negative values          |
| `warning`        | `#f59e0b`                                        | Anomalies                        |
| `border`         | `#334155`                                        | Dividers                         |

**Midnight Theme:**

| Token            | Value     | Notes                 |
| ---------------- | --------- | --------------------- |
| `bg-primary`     | `#0b1120` | Deeper than Dark      |
| `bg-secondary`   | `#151d30` | Slightly lighter navy |
| `bg-tertiary`    | `#1e2a42` | Input/table header    |
| `text-primary`   | `#e8ecf4` | Slightly warm white   |
| `text-secondary` | `#a0aec0` | Muted text            |
| `text-muted`     | `#5a6a80` | Captions              |
| `border`         | `#1e2a42` | Subtle borders        |

**Ocean Theme:**

| Token            | Value     | Notes                |
| ---------------- | --------- | -------------------- |
| `bg-primary`     | `#f0fdfa` | Very light teal tint |
| `bg-secondary`   | `#e6faf5` | Subtle teal wash     |
| `bg-tertiary`    | `#ccfbf1` | Teal-tinted inputs   |
| `text-primary`   | `#134e4a` | Dark teal            |
| `text-secondary` | `#2d6a5e` | Medium teal          |
| `text-muted`     | `#6ba39a` | Muted teal           |
| `border`         | `#99f6e4` | Teal borders         |

All preset themes inherit the deployment `brand` color. Brand-derived tokens (`brand-subtle`, `brand-hover`, `brand-active`) are auto-generated from the brand hex using HSL lightness adjustments.

### 3.2 Typography

- **Font family:** Inter (with `system-ui, -apple-system, sans-serif` fallback)
- **Monospace:** JetBrains Mono (for data values, code)

| Level           | Size | Weight | Usage                                               |
| --------------- | ---- | ------ | --------------------------------------------------- |
| Page Title      | 28px | 700    | Page headings                                       |
| Section Heading | 20px | 600    | Section titles                                      |
| Card Title      | 16px | 600    | Card headers, modal titles                          |
| Body            | 14px | 500    | Primary content                                     |
| Secondary       | 13px | 400    | Descriptions, secondary text                        |
| Caption         | 12px | 400    | Meta info, timestamps                               |
| Label           | 11px | 500    | Uppercase labels, overlines (letter-spacing: 0.5px) |

### 3.3 Spacing Scale

| Token | Value |
| ----- | ----- |
| `xs`  | 4px   |
| `sm`  | 8px   |
| `md`  | 12px  |
| `lg`  | 16px  |
| `xl`  | 24px  |
| `2xl` | 32px  |

### 3.4 Border Radius

| Token  | Value  | Usage                |
| ------ | ------ | -------------------- |
| `sm`   | 4px    | Small elements, tags |
| `md`   | 8px    | Inputs, buttons      |
| `lg`   | 12px   | Cards, modals        |
| `full` | 9999px | Pills, avatars       |

### 3.5 Shadows (Elevation)

| Token       | Value                                                     | Usage                       |
| ----------- | --------------------------------------------------------- | --------------------------- |
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)`                              | Subtle lift                 |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`  | Cards (default)             |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Modals, hover cards         |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)` | Dropdowns, expanded sidebar |

---

## 4. Brand Customization Model

### 4.1 Deployment Level (Admin configures)

- **Brand primary color** (hex) -- auto-generates `brand-subtle`, `brand-hover`, `brand-active` variants
- **Logo URL** + favicon
- **Company name** (shown in expanded sidebar)
- Stored in system settings, applied via CSS custom properties at root level

### 4.2 User Level (Preferences)

- **Theme preset:** Light (default), Dark, Midnight, Ocean
- All presets inherit the deployment brand color
- Persisted per-user in preferences API
- System `prefers-color-scheme` as initial fallback

---

## 5. Chat Page Redesign

### 5.1 Layout

Split-view with resizable divider:

```
+--------+------------------------------+----------------------------------+
| Sidebar| Chat Thread (36%)            | Data Panel (64%)                 |
| (48px) |                              |                                  |
|        | Conversation bubbles         | Query results / Pinned dashboard |
|        | Suggestions                  | KPI summaries                    |
|        | Input box                    | Table / Chart / Export           |
+--------+------------------------------+----------------------------------+
```

- **Divider:** Draggable, resizable
- **Default split:** 36% chat / 64% data
- **Min chat width:** 280px
- **Max chat width:** 50%
- **Double-click divider:** Reset to default
- **Split ratio:** Persisted in user preferences

### 5.2 Chat Thread (Left Panel)

**Welcome / Idle State:**

- Centered welcome message: "What can I help with?"
- Subtitle: "Ask about your data, run queries, or explore insights"
- 3-4 suggested query cards (clickable, from recent/popular queries)

**Active Conversation:**

- **User messages:** Right-aligned, brand-colored bubble (border-radius: 12px 12px 4px 12px)
- **Bot responses:** Left-aligned, white bubble with border
  - **Summary line:** Query name (bold, brand color) + metadata ("5 groups, 93 rows")
  - **Inline metric badges:** Colored pills for key values (e.g., "APAC $1.8M" in green)
  - **"View in panel"** link to highlight the data panel
- **Suggestion chips:** Below bot messages, horizontal wrap, 10px font, border pill style
- **Date separators:** "Today", "Yesterday", formatted dates
- **Scroll:** Auto-scroll on new messages, manual scroll pauses auto-scroll

**Input Area:**

- Fixed at bottom of chat panel
- Rounded input (radius: 10px) with file upload icon + send button
- Send button: brand-colored square with arrow icon
- Enter to send, Shift+Enter for newline
- File drop zone support

### 5.3 Data Panel (Right Panel)

**Idle State (No Active Query):**

- Header: "Pinned Queries" with "Customize" link
- Mini KPI cards in 2-column grid (from user's favorited queries)
- Mini chart cards (pinned visualizations with auto-refresh)
- Recent anomaly alerts card
- All cards are clickable (loads the query into chat)

**Active Query Result:**

- **Result card** (full panel, white background, shadow-sm, radius-lg):
  - **Header:** Query name (16px/600) + metadata subtitle + Table/Chart/Export toggle
  - **Inline KPI summary:** 2-4 key metrics in bg-secondary pills above the data
  - **Data area:** Table or chart (based on toggle)
  - **Footer:** Row count + execution time + Pin button + "Open in Dashboard" link
- **Table rendering:** Follows the shared Data Table component (Section 7)
- **Chart rendering:** Uses existing Recharts components with updated color palette

**Transitions:**

- Idle to active: Data panel crossfades (200ms)
- New result replaces old: Slide-up transition (200ms ease-out)

### 5.4 Top Bar Context (Chat Page)

- Page title: "Chat"
- Group selector dropdown
- Active query indicator: Brand pill with dot + query name (when query is active)
- Cmd+K search hint
- Clear chat / History actions (shown on hover or via more menu)

---

## 6. Dashboard Page Redesign

### 6.1 Progressive Disclosure (Default Mode)

**Top bar additions:**

- Dashboard selector dropdown (switch between saved dashboards)
- Active filter pills with remove buttons + "+ Filter" button
- "Edit" button (unlocks editing mode)

**KPI Strip:**

- Horizontal row of KPI cards below top bar
- Each card: label (uppercase 10px), value (20px bold), change badge (pill)
- Responsive: wraps on smaller screens

**Card Grid:**

- Cards display data only -- no visible controls
- Clean card surface: title + timestamp in header, data in body
- Interactive cards show "Interactive" badge
- Anomaly cards show warning left-border accent

### 6.2 Hover State

When user hovers a card:

- Shadow elevates from `shadow-sm` to `shadow-md` (150ms transition)
- Subtle brand border appears
- **Toolbar appears** in card header: Refresh, Maximize, Settings, More (...)
- Toolbar icons: 26px square ghost buttons

### 6.3 Edit Mode

Triggered by "Edit" button in top bar:

- **Brand-colored toolbar strip** replaces or overlays below top bar
  - Shows: "Editing: [Dashboard Name]" + Add Card + Add KPI + Done button
- Cards switch to **dashed borders** (2px dashed brand-subtle)
- **Resize handles** visible at bottom-right corners
- **Drag handles** enabled on card headers
- Click "Done" to exit edit mode and save layout

### 6.4 Presentation Mode

Triggered by full-screen button or keyboard shortcut:

- **Full-screen, no sidebar, no top bar**
- **Always dark background** (`#0f172a`) regardless of user theme
- Minimal top strip: Logo + dashboard name + group + last updated time
- **Larger KPI cards** with bigger fonts (24px values)
- **Auto-rotating card pages** with dot indicators at bottom
- Configurable rotation interval (default 30s)
- Press **Esc** to exit
- Auto-refresh active (interval from dashboard settings)

---

## 7. Shared Component Library

### 7.1 Buttons

| Variant   | Style                                  |
| --------- | -------------------------------------- |
| Primary   | Brand background, white text           |
| Secondary | White background, dark text, border    |
| Ghost     | Transparent background, secondary text |
| Danger    | Red background, white text             |
| Link      | Brand text, underline                  |

- **Sizes:** Small (5px/12px padding, 11px font), Medium (8px/16px, 13px), Large (10px/20px, 14px), Icon (36px square)
- **States:** Hover (opacity 0.9, 150ms), Focus (2px brand ring), Disabled (opacity 0.5), Loading (spinner + disabled)

### 7.2 Inputs

- **Text input:** Border (border token), radius-md, 8px/12px padding, focus: brand border
- **Select:** Same as text + chevron icon, searchable dropdown
- **Multi-select:** Pill-based with remove buttons, "+ add" text
- **Date range:** Calendar icon, preset chips below (Today, 7d, 30d, Q4, YTD)
- **Error state:** Danger border + red helper text below

### 7.3 Data Table

- **Header:** bg-tertiary, 600 weight, sortable (click toggles asc/desc with arrow indicator)
- **Rows:** Alternating subtle bg on hover, checkbox column, font-variant-numeric: tabular-nums for numbers
- **Status cells:** Colored pill badges (Active=success, Review=warning, Failed=danger)
- **Anomaly rows:** Warning background tint + warning icon next to name
- **Trend cells:** Colored up/down arrows with percentage
- **Pagination:** Bottom bar with row count, page buttons (brand active page)

### 7.4 Modals

- **Standard modal:** Centered, max-width 640px, backdrop blur, shadow-lg, radius-lg
  - Header: Title + close (X) button
  - Footer: Cancel (secondary) + Save (primary)
  - Esc to close, focus trap, body scroll lock
- **Slide-over panel:** Slides from right, 320-480px width, shadow on left edge
  - Used for: filter panels, settings, detail views
  - Same close behavior as modals

### 7.5 Toast Notifications

- **Position:** Bottom-right, stacked (max 3 visible)
- **Types:** Success (green check icon), Error (red left border), Warning (amber left border)
- **Auto-dismiss:** 5s for success, persistent for errors (manual dismiss)
- **Actions:** Optional inline link (e.g., "Retry", "View")
- **Animation:** Slide-in from right (200ms)

### 7.6 Loading States

- **Skeleton loaders:** Pulsing bg-tertiary rectangles matching content shape
- **Button loading:** Spinner icon replaces label, button disabled
- **Page transitions:** Fade + slide-up (200ms ease-out), content area only (shell stays)

---

## 8. Transitions & Micro-Interactions

| Interaction         | Animation                                                 |
| ------------------- | --------------------------------------------------------- |
| Page navigation     | Content fade + slide-up, 200ms ease-out                   |
| Card hover          | Shadow elevates shadow-sm to shadow-md, 150ms             |
| Card add            | Scale 0.95 to 1, 200ms                                    |
| Card remove         | Fade out + scale to 0.95, 200ms                           |
| Card reorder (drag) | Smooth translate to new position                          |
| Sidebar expand      | Slide-right 200ms, collapse after 300ms mouse-leave delay |
| Modal open          | Fade-in backdrop + scale 0.95 to 1 content, 200ms         |
| Modal close         | Reverse of open                                           |
| Slide-over open     | Slide from right, 250ms ease-out                          |
| Toast appear        | Slide-in from right, 200ms                                |
| Data panel switch   | Crossfade, 200ms                                          |
| Chat new message    | Slide-up into position, 150ms                             |
| Button hover        | Opacity 0.9, 150ms                                        |
| Success feedback    | Brief green flash on element (300ms)                      |

---

## 9. Implementation Strategy

**Approach:** Page-by-page reskin (top-down)

### Phase 1: Foundation

1. Create design token file (`src/styles/tokens.css`) with all CSS custom properties
2. Build new `AppShell` component (sidebar + contextual top bar layout)
3. Build `ThemeProvider` upgrade (brand config + preset themes + CSS variable injection)

### Phase 2: Chat Page

4. Build `ChatSplitView` layout component (resizable panels)
5. Redesign `MessageBubble` -- compact bubbles with inline metrics + "View in panel" link
6. Build `DataPanel` component (idle state with pinned queries, active state with result card)
7. Redesign `ChatInput` with new styling
8. Wire up suggestion chips below bot messages

### Phase 3: Dashboard Page

9. Redesign `DashboardShell` with progressive disclosure (hover toolbar, edit mode)
10. Redesign `QueryCard` with clean card surface + hover state
11. Build `KpiStrip` component for dashboard top
12. Build `PresentationMode` component (full-screen dark, auto-rotate)
13. Redesign `CardSettingsModal` and `DashboardSettingsModal` with new modal pattern

### Phase 4: Shared Components

14. Build/update shared primitives: Button, Input, Select, DateRange, DataTable, Toast, Modal, SlideOver
15. Update `FilterInput` with new pill-based filter UX
16. Migrate remaining pages (Data Explorer, Grid Board, Admin) to use new shell + tokens

### Phase 5: Polish

17. Add all transitions and micro-interactions
18. Test all 4 theme presets (Light, Dark, Midnight, Ocean)
19. Test brand customization flow (admin sets color, propagates to all themes)
20. Responsive testing (mobile collapse sidebar, stack chat split view)

---

## 10. Files to Create / Modify

### New Files

- `src/styles/tokens.css` -- Design token CSS custom properties
- `src/components/shell/AppShell.tsx` -- New app shell layout
- `src/components/shell/Sidebar.tsx` -- Collapsible icon sidebar
- `src/components/shell/ContextualTopBar.tsx` -- Page-specific top bar
- `src/components/chat/ChatSplitView.tsx` -- Split-view layout
- `src/components/chat/DataPanel.tsx` -- Right-side data panel
- `src/components/chat/PinnedDashboard.tsx` -- Idle state pinned queries
- `src/components/dashboard/KpiStrip.tsx` -- KPI row component
- `src/components/dashboard/PresentationMode.tsx` -- Full-screen TV mode
- `src/components/dashboard/CardToolbar.tsx` -- Hover toolbar overlay
- `src/components/dashboard/EditModeBar.tsx` -- Edit mode toolbar strip
- `src/components/ui/Toast.tsx` -- Toast notification system
- `src/components/ui/SlideOver.tsx` -- Slide-over panel
- `src/components/ui/Button.tsx` -- Standardized button component
- `src/components/ui/Input.tsx` -- Standardized input component
- `src/components/ui/DataTable.tsx` -- Standardized data table
- `src/components/ui/Skeleton.tsx` -- Loading skeleton component

### Major Modifications

- `src/app/layout.tsx` -- Wrap with new AppShell
- `src/app/page.tsx` -- Chat page with ChatSplitView
- `src/app/dashboard/page.tsx` -- Dashboard with progressive disclosure
- `src/app/globals.css` -- Replace inline tokens with token file import, remove legacy styles
- `src/contexts/ThemeContext.tsx` -- Upgrade for brand config + preset themes
- `src/components/AppHeader.tsx` -- Replace with Sidebar + ContextualTopBar
- `src/components/chat/MessageBubble.tsx` -- Compact bubble redesign
- `src/components/chat/ChatWindow.tsx` -- Integrate split view
- `src/components/chat/ChatInput.tsx` -- New input styling
- `src/components/dashboard/GridDashboard.tsx` -- Progressive disclosure + edit mode
- `src/components/dashboard/QueryCard.tsx` -- Clean card + hover toolbar
- `src/components/dashboard/DashboardShell.tsx` -- New shell integration
- `src/components/shared/FilterInput.tsx` -- Pill-based filter UX

---

## 11. Out of Scope (Future Sub-Projects)

The following are explicitly deferred to subsequent design/implementation cycles:

- Data Explorer page redesign (beyond applying new shell + tokens)
- Grid Board page redesign
- Admin panel redesign
- Backend robustness improvements (duplicate query prevention, error surfacing)
- CSV/XLS connector admin config page
- Feature page updates
- Lineage feature fixes
- Plugin architecture / extensibility model

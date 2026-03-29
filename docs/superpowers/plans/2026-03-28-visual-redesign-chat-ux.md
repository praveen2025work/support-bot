# Visual Redesign & Chat UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Chatbot platform from a top-nav layout with full-width chat into a polished enterprise SaaS app with icon sidebar, contextual top bar, split-view chat, progressive-disclosure dashboard, and a multi-theme system with brand customization.

**Architecture:** New AppShell wraps all pages (sidebar + contextual top bar). Chat page splits into a narrow conversation thread (36%) and a wide data panel (64%). Dashboard cards hide controls by default, revealing them on hover/edit. A CSS custom property token system powers 4 theme presets plus deployment-level brand injection.

**Tech Stack:** Next.js 14 (App Router), React 18, Tailwind CSS v4, CSS custom properties, Recharts, lucide-react, existing Express engine (no backend changes).

**Spec:** [docs/superpowers/specs/2026-03-28-visual-redesign-chat-ux-design.md](../specs/2026-03-28-visual-redesign-chat-ux-design.md)

---

## File Structure

### New Files

| File                                                | Responsibility                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `src/styles/tokens.css`                             | All CSS custom property definitions for 4 themes + brand overrides |
| `src/components/shell/AppShell.tsx`                 | Root layout: sidebar + top bar + content area                      |
| `src/components/shell/Sidebar.tsx`                  | 48px icon sidebar, expand on hover, pin to lock                    |
| `src/components/shell/ContextualTopBar.tsx`         | Page-specific top bar with group selector, filters, actions        |
| `src/components/chat/ChatSplitView.tsx`             | Resizable split layout (chat thread + data panel)                  |
| `src/components/chat/DataPanel.tsx`                 | Right panel: idle pinned dashboard or active query result          |
| `src/components/chat/PinnedDashboard.tsx`           | Idle-state mini-dashboard of user's favorited queries              |
| `src/components/chat/CompactMessage.tsx`            | Compact chat bubble with inline metrics + panel link               |
| `src/components/dashboard/KpiStrip.tsx`             | Horizontal row of KPI summary cards                                |
| `src/components/dashboard/CardToolbar.tsx`          | Hover-revealed toolbar (refresh, maximize, settings, more)         |
| `src/components/dashboard/EditModeBar.tsx`          | Brand-colored edit strip with Add Card / Add KPI / Done            |
| `src/components/dashboard/PresentationMode.tsx`     | Full-screen dark TV/projector mode with auto-rotate                |
| `src/components/ui/Button.tsx`                      | Standardized button (primary, secondary, ghost, danger, link)      |
| `src/components/ui/Toast.tsx`                       | Toast notification system (bottom-right stack)                     |
| `src/components/ui/SlideOver.tsx`                   | Slide-from-right panel for filters/settings                        |
| `src/components/ui/Skeleton.tsx`                    | Loading skeleton primitives                                        |
| `src/__tests__/shell/Sidebar.test.tsx`              | Sidebar unit tests                                                 |
| `src/__tests__/shell/ContextualTopBar.test.tsx`     | Top bar unit tests                                                 |
| `src/__tests__/chat/ChatSplitView.test.tsx`         | Split view unit tests                                              |
| `src/__tests__/chat/DataPanel.test.tsx`             | Data panel unit tests                                              |
| `src/__tests__/chat/CompactMessage.test.tsx`        | Compact message unit tests                                         |
| `src/__tests__/dashboard/KpiStrip.test.tsx`         | KPI strip unit tests                                               |
| `src/__tests__/dashboard/CardToolbar.test.tsx`      | Card toolbar unit tests                                            |
| `src/__tests__/dashboard/PresentationMode.test.tsx` | Presentation mode unit tests                                       |
| `src/__tests__/ui/Button.test.tsx`                  | Button unit tests                                                  |
| `src/__tests__/ui/Toast.test.tsx`                   | Toast unit tests                                                   |

### Modified Files

| File                                          | Changes                                                   |
| --------------------------------------------- | --------------------------------------------------------- |
| `src/app/globals.css`                         | Import tokens.css, remove legacy inline token definitions |
| `src/app/layout.tsx`                          | Wrap children with AppShell instead of bare div           |
| `src/app/page.tsx`                            | Replace ChatWindow + AppHeader with ChatSplitView         |
| `src/app/dashboard/page.tsx`                  | Pass edit mode and presentation mode props                |
| `src/contexts/ThemeContext.tsx`               | Add brand config, 4 preset themes, CSS variable injection |
| `src/components/chat/ChatWindow.tsx`          | Remove header, adapt for narrow panel width               |
| `src/components/chat/MessageBubble.tsx`       | Add compact mode rendering path                           |
| `src/components/chat/SuggestionChips.tsx`     | Smaller chip sizing for split view                        |
| `src/components/dashboard/GridDashboard.tsx`  | Add hover toolbar, edit mode gating                       |
| `src/components/dashboard/QueryCard.tsx`      | Clean card surface, hide controls by default              |
| `src/components/dashboard/DashboardShell.tsx` | Integrate KpiStrip, EditModeBar, PresentationMode         |

---

## Phase 1: Foundation (Tokens, Theme, Shell)

### Task 1: Design Token CSS File

**Files:**

- Create: `src/styles/tokens.css`

- [ ] **Step 1: Create the token file with all 4 themes**

```css
/* src/styles/tokens.css */

/* ============================================
   Design Tokens — Chatbot Platform
   4 themes: light (default), dark, midnight, ocean
   Brand color injected at :root via ThemeProvider
   ============================================ */

:root {
  /* Brand (default — overridden by ThemeProvider) */
  --brand: #6366f1;
  --brand-subtle: #eef2ff;
  --brand-hover: #4f46e5;
  --brand-active: #4338ca;
  --brand-text: #ffffff;

  /* Surfaces */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;

  /* Text */
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  /* Status */
  --success: #059669;
  --success-subtle: #ecfdf5;
  --danger: #dc2626;
  --danger-subtle: #fef2f2;
  --warning: #d97706;
  --warning-subtle: #fffbeb;

  /* Border */
  --border: #e2e8f0;
  --border-subtle: #f1f5f9;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  /* Typography */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Sidebar */
  --sidebar-width: 48px;
  --sidebar-expanded: 200px;
  --topbar-height: 44px;
}

/* Dark theme */
.dark {
  --brand: #818cf8;
  --brand-subtle: rgba(99, 102, 241, 0.15);
  --brand-hover: #a5b4fc;
  --brand-active: #6366f1;
  --brand-text: #ffffff;

  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;

  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;

  --success: #10b981;
  --success-subtle: rgba(16, 185, 129, 0.15);
  --danger: #ef4444;
  --danger-subtle: rgba(239, 68, 68, 0.15);
  --warning: #f59e0b;
  --warning-subtle: rgba(245, 158, 11, 0.15);

  --border: #334155;
  --border-subtle: #1e293b;

  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3);
}

/* Midnight theme */
.midnight {
  --brand: #818cf8;
  --brand-subtle: rgba(99, 102, 241, 0.12);
  --brand-hover: #a5b4fc;
  --brand-active: #6366f1;
  --brand-text: #ffffff;

  --bg-primary: #0b1120;
  --bg-secondary: #151d30;
  --bg-tertiary: #1e2a42;

  --text-primary: #e8ecf4;
  --text-secondary: #a0aec0;
  --text-muted: #5a6a80;

  --success: #10b981;
  --success-subtle: rgba(16, 185, 129, 0.12);
  --danger: #ef4444;
  --danger-subtle: rgba(239, 68, 68, 0.12);
  --warning: #f59e0b;
  --warning-subtle: rgba(245, 158, 11, 0.12);

  --border: #1e2a42;
  --border-subtle: #151d30;

  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.4);
}

/* Ocean theme */
.ocean {
  --brand: #6366f1;
  --brand-subtle: #eef2ff;
  --brand-hover: #4f46e5;
  --brand-active: #4338ca;
  --brand-text: #ffffff;

  --bg-primary: #f0fdfa;
  --bg-secondary: #e6faf5;
  --bg-tertiary: #ccfbf1;

  --text-primary: #134e4a;
  --text-secondary: #2d6a5e;
  --text-muted: #6ba39a;

  --success: #059669;
  --success-subtle: #d1fae5;
  --danger: #dc2626;
  --danger-subtle: #fee2e2;
  --warning: #d97706;
  --warning-subtle: #fef3c7;

  --border: #99f6e4;
  --border-subtle: #ccfbf1;

  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04);
}

/* Presentation mode (always dark, used by PresentationMode component) */
.presentation {
  --bg-primary: #0f172a;
  --bg-secondary: rgba(255, 255, 255, 0.04);
  --bg-tertiary: rgba(255, 255, 255, 0.06);

  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  --border: rgba(255, 255, 255, 0.06);
  --border-subtle: rgba(255, 255, 255, 0.03);
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls -la src/styles/tokens.css`
Expected: File exists with non-zero size.

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: add design token CSS with 4 theme presets"
```

---

### Task 2: Upgrade ThemeContext for Brand + Presets

**Files:**

- Modify: `src/contexts/ThemeContext.tsx`
- Test: `src/__tests__/ThemeContext.test.tsx`

- [ ] **Step 1: Write failing test for new theme system**

```tsx
// src/__tests__/ThemeContext.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function ThemeDisplay() {
  const { theme, setTheme, isDark, availableThemes } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <span data-testid="themes">{availableThemes.join(",")}</span>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("midnight")}>Midnight</button>
      <button onClick={() => setTheme("ocean")}>Ocean</button>
      <button onClick={() => setTheme("light")}>Light</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("defaults to light theme", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("isDark")).toHaveTextContent("false");
  });

  it("lists all 4 available themes", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("themes")).toHaveTextContent(
      "light,dark,midnight,ocean",
    );
  });

  it("switches to dark and applies class", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    act(() => screen.getByText("Dark").click());
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("isDark")).toHaveTextContent("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switches to midnight and applies class", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    act(() => screen.getByText("Midnight").click());
    expect(screen.getByTestId("theme")).toHaveTextContent("midnight");
    expect(screen.getByTestId("isDark")).toHaveTextContent("true");
    expect(document.documentElement.classList.contains("midnight")).toBe(true);
  });

  it("switches to ocean (light variant)", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    act(() => screen.getByText("Ocean").click());
    expect(screen.getByTestId("theme")).toHaveTextContent("ocean");
    expect(screen.getByTestId("isDark")).toHaveTextContent("false");
    expect(document.documentElement.classList.contains("ocean")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/ThemeContext.test.tsx --no-cache`
Expected: FAIL — `setTheme` and `availableThemes` don't exist yet.

- [ ] **Step 3: Implement upgraded ThemeContext**

Replace the contents of `src/contexts/ThemeContext.tsx`:

```tsx
"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "midnight" | "ocean";

const AVAILABLE_THEMES: readonly Theme[] = [
  "light",
  "dark",
  "midnight",
  "ocean",
] as const;

const DARK_THEMES: ReadonlySet<Theme> = new Set(["dark", "midnight"]);

const STORAGE_KEY = "chatbot-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  availableThemes: readonly Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && AVAILABLE_THEMES.includes(stored as Theme))
    return stored as Theme;
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function applyThemeClass(theme: Theme) {
  const el = document.documentElement;
  // Remove all theme classes
  el.classList.remove("dark", "midnight", "ocean");
  // Remove legacy classes
  el.classList.remove(
    "banking-blue",
    "regulatory-green",
    "risk-amber",
    "analytics-purple",
  );
  if (theme !== "light") {
    el.classList.add(theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const mountedRef = useRef(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyThemeClass(initial);
    mountedRef.current = true;
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeClass(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const isDark = DARK_THEMES.has(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark,
        availableThemes: AVAILABLE_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/ThemeContext.test.tsx --no-cache`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/ThemeContext.tsx src/__tests__/ThemeContext.test.tsx
git commit -m "feat: upgrade ThemeContext with 4 preset themes and brand support"
```

---

### Task 3: Wire Token CSS into globals.css

**Files:**

- Modify: `src/app/globals.css`

- [ ] **Step 1: Add token import at top of globals.css**

Add this as the very first line of `src/app/globals.css`, before the existing `@import "tailwindcss"`:

```css
@import "../styles/tokens.css";
```

- [ ] **Step 2: Remove legacy inline token definitions from globals.css**

Remove the `:root { }` block and `.dark { }` block that define the old HSL-based tokens (`--background`, `--foreground`, `--primary`, etc.) and the legacy hex tokens (`--bg-primary`, `--bg-secondary`, etc.). Keep the Tailwind `@theme` block, print styles, and any component-specific styles.

The new tokens from `tokens.css` replace both the HSL variables and the legacy hex variables. Anywhere in the codebase that references `var(--bg-primary)` or `var(--text-primary)` will now resolve to the values from `tokens.css`.

- [ ] **Step 3: Verify app still loads**

Run: `npm run dev:mock` and open http://localhost:3000. Verify the page renders without broken styles.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor: wire design tokens into globals.css, remove legacy token definitions"
```

---

### Task 4: Button Component

**Files:**

- Create: `src/components/ui/Button.tsx`
- Test: `src/__tests__/ui/Button.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/ui/Button.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders with default variant and medium size", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("bg-[var(--brand)]");
  });

  it("renders secondary variant", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole("button", { name: "Secondary" });
    expect(btn.className).toContain("border");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole("button", { name: "Ghost" });
    expect(btn.className).not.toContain("bg-[var(--brand)]");
  });

  it("renders danger variant", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("bg-[var(--danger)]");
  });

  it("renders small size", () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole("button", { name: "Small" });
    expect(btn.className).toContain("text-[11px]");
  });

  it("renders disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button", { name: "Disabled" });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("opacity-50");
  });

  it("renders loading state", () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/ui/Button.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Button component**

```tsx
// src/components/ui/Button.tsx
"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--brand)] text-[var(--brand-text)] hover:opacity-90",
  secondary:
    "bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
  link: "bg-transparent text-[var(--brand)] underline underline-offset-2 hover:opacity-80 p-0",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-[5px] text-[11px] rounded-[var(--radius-md)]",
  md: "px-4 py-2 text-[13px] rounded-[var(--radius-md)]",
  lg: "px-5 py-[10px] text-[14px] rounded-[var(--radius-md)]",
  icon: "w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-all duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2
          ${variantClasses[variant]}
          ${variant !== "link" ? sizeClasses[size] : ""}
          ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${className}
        `.trim()}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? null : children}
      </button>
    );
  },
);

Button.displayName = "Button";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/ui/Button.test.tsx --no-cache`
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx src/__tests__/ui/Button.test.tsx
git commit -m "feat: add standardized Button component with 5 variants"
```

---

### Task 5: Toast Notification System

**Files:**

- Create: `src/components/ui/Toast.tsx`
- Test: `src/__tests__/ui/Toast.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/ui/Toast.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function ToastTrigger() {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast({ type: "success", message: "Saved!" })}>
        Success
      </button>
      <button
        onClick={() =>
          addToast({
            type: "error",
            message: "Failed!",
            action: { label: "Retry", onClick: jest.fn() },
          })
        }
      >
        Error
      </button>
      <button
        onClick={() => addToast({ type: "warning", message: "Watch out" })}
      >
        Warning
      </button>
    </div>
  );
}

describe("Toast", () => {
  it("shows a success toast", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Success").click());
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("shows an error toast with action", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Error").click());
    expect(screen.getByText("Failed!")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("auto-dismisses success toast", () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Success").click());
    expect(screen.getByText("Saved!")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(6000));
    expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("does NOT auto-dismiss error toast", () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Error").click());
    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByText("Failed!")).toBeInTheDocument();
    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/ui/Toast.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Toast system**

```tsx
// src/components/ui/Toast.tsx
"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { CheckCircle2, X } from "lucide-react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastData {
  type: "success" | "error" | "warning";
  message: string;
  action?: ToastAction;
}

interface ToastEntry extends ToastData {
  id: number;
}

interface ToastContextValue {
  addToast: (toast: ToastData) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 0;

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 3;

const borderColors: Record<ToastData["type"], string> = {
  success: "",
  error: "border-l-[3px] border-l-[var(--danger)]",
  warning: "border-l-[3px] border-l-[var(--warning)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: ToastData) => {
      const id = ++nextId;
      setToasts((prev) => [
        ...prev.slice(-(MAX_VISIBLE - 1)),
        { ...toast, id },
      ]);
      if (toast.type === "success") {
        setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-2
              bg-[var(--bg-primary)] border border-[var(--border)]
              rounded-[var(--radius-lg)] px-3.5 py-2.5
              shadow-[var(--shadow-md)] animate-slide-in-right
              text-[13px] text-[var(--text-primary)]
              ${borderColors[toast.type]}
            `.trim()}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-[18px] h-[18px] text-[var(--success)] flex-shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="text-[var(--brand)] underline text-[11px] flex-shrink-0"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/ui/Toast.test.tsx --no-cache`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Toast.tsx src/__tests__/ui/Toast.test.tsx
git commit -m "feat: add Toast notification system with auto-dismiss"
```

---

### Task 6: Skeleton Loading Component

**Files:**

- Create: `src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create Skeleton component**

```tsx
// src/components/ui/Skeleton.tsx
"use client";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  const radiusMap = {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    full: "var(--radius-full)",
  };
  return (
    <div
      className={`animate-pulse bg-[var(--bg-tertiary)] ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? 16,
        borderRadius: radiusMap[rounded],
      }}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--bg-primary)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] ${className}`}
    >
      <Skeleton height={14} width="60%" className="mb-3" />
      <Skeleton height={10} width="40%" className="mb-4" />
      <Skeleton height={80} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Skeleton.tsx
git commit -m "feat: add Skeleton loading primitives"
```

---

### Task 7: Sidebar Component

**Files:**

- Create: `src/components/shell/Sidebar.tsx`
- Test: `src/__tests__/shell/Sidebar.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/shell/Sidebar.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/shell/Sidebar";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush }),
}));

describe("Sidebar", () => {
  it("renders nav icons", () => {
    render(<Sidebar />);
    expect(screen.getByTitle("Chat")).toBeInTheDocument();
    expect(screen.getByTitle("Dashboard")).toBeInTheDocument();
    expect(screen.getByTitle("Grid Board")).toBeInTheDocument();
    expect(screen.getByTitle("Data Explorer")).toBeInTheDocument();
  });

  it("highlights active route", () => {
    render(<Sidebar />);
    const chatBtn = screen.getByTitle("Chat");
    expect(chatBtn.className).toContain("bg-[var(--brand-subtle)]");
  });

  it("shows labels on hover", () => {
    render(<Sidebar />);
    const sidebar = screen.getByTestId("sidebar");
    fireEvent.mouseEnter(sidebar);
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("hides labels when not hovered", () => {
    render(<Sidebar />);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/shell/Sidebar.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Sidebar**

```tsx
// src/components/shell/Sidebar.tsx
"use client";
import { useState, useCallback, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  Table2,
  Compass,
  Settings,
  Shield,
  Pin,
} from "lucide-react";

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  title: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: <MessageSquare className="w-[18px] h-[18px]" />,
    label: "Chat",
    href: "/",
    title: "Chat",
  },
  {
    icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
    label: "Dashboard",
    href: "/dashboard",
    title: "Dashboard",
  },
  {
    icon: <Table2 className="w-[18px] h-[18px]" />,
    label: "Grid Board",
    href: "/gridboard",
    title: "Grid Board",
  },
  {
    icon: <Compass className="w-[18px] h-[18px]" />,
    label: "Data Explorer",
    href: "/data-explorer",
    title: "Data Explorer",
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  {
    icon: <Shield className="w-[18px] h-[18px]" />,
    label: "Admin",
    href: "/admin",
    title: "Admin",
    adminOnly: true,
  },
  {
    icon: <Settings className="w-[18px] h-[18px]" />,
    label: "Settings",
    href: "/admin/settings",
    title: "Settings",
  },
];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    clearTimeout(collapseTimer.current);
    setExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (pinned) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), 300);
  }, [pinned]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isExpanded = expanded || pinned;

  return (
    <nav
      data-testid="sidebar"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        fixed left-0 top-0 h-screen z-40
        bg-[var(--bg-primary)] border-r border-[var(--border)]
        flex flex-col items-center py-3 gap-1
        transition-all duration-200 ease-out
        ${isExpanded ? "w-[var(--sidebar-expanded)] shadow-[var(--shadow-lg)] items-start px-2.5" : "w-[var(--sidebar-width)]"}
      `.trim()}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2 mb-3 ${isExpanded ? "px-1" : ""}`}
      >
        <div className="w-[30px] h-[30px] bg-gradient-to-br from-[var(--brand)] to-[#8b5cf6] rounded-[var(--radius-md)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          C
        </div>
        {isExpanded && (
          <span className="text-[13px] font-semibold text-[var(--text-primary)] whitespace-nowrap">
            ChartBoard
          </span>
        )}
      </div>

      {/* Main nav */}
      {NAV_ITEMS.map((item) => (
        <button
          key={item.href}
          title={item.title}
          onClick={() => router.push(item.href)}
          className={`
            w-full flex items-center gap-2 rounded-[var(--radius-md)] transition-colors duration-150
            ${isExpanded ? "px-2 py-[7px]" : "justify-center py-[7px]"}
            ${
              isActive(item.href)
                ? "bg-[var(--brand-subtle)] text-[var(--brand)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
            }
          `.trim()}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {isExpanded && (
            <span className="text-[12px] font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Separator */}
      <div
        className={`h-px bg-[var(--border)] my-1 ${isExpanded ? "w-full" : "w-[30px]"}`}
      />

      {/* Bottom nav */}
      {BOTTOM_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
        <button
          key={item.href}
          title={item.title}
          onClick={() => router.push(item.href)}
          className={`
            w-full flex items-center gap-2 rounded-[var(--radius-md)] transition-colors duration-150
            ${isExpanded ? "px-2 py-[7px]" : "justify-center py-[7px]"}
            ${
              isActive(item.href)
                ? "bg-[var(--brand-subtle)] text-[var(--brand)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
            }
          `.trim()}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {isExpanded && (
            <span className="text-[12px] font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}
        </button>
      ))}

      {/* Pin button (only visible when expanded) */}
      {isExpanded && (
        <button
          onClick={() => setPinned((p) => !p)}
          className={`
            mt-1 w-full flex items-center gap-2 px-2 py-[5px] rounded-[var(--radius-md)]
            text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-[11px]
            ${pinned ? "text-[var(--brand)]" : ""}
          `.trim()}
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          <Pin className={`w-3.5 h-3.5 ${pinned ? "fill-current" : ""}`} />
          <span>{pinned ? "Unpin" : "Pin open"}</span>
        </button>
      )}

      {/* User avatar */}
      <div className="mt-2">
        <div className="w-[26px] h-[26px] rounded-[var(--radius-full)] bg-gradient-to-br from-[var(--brand-subtle)] to-[var(--bg-tertiary)]" />
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/shell/Sidebar.test.tsx --no-cache`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/Sidebar.tsx src/__tests__/shell/Sidebar.test.tsx
git commit -m "feat: add collapsible icon Sidebar with hover expand and pin"
```

---

### Task 8: Contextual Top Bar

**Files:**

- Create: `src/components/shell/ContextualTopBar.tsx`
- Test: `src/__tests__/shell/ContextualTopBar.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/shell/ContextualTopBar.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";

describe("ContextualTopBar", () => {
  it("renders page title", () => {
    render(<ContextualTopBar title="Chat" />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders group selector when groups provided", () => {
    render(
      <ContextualTopBar
        title="Chat"
        groups={[
          { id: "default", name: "Default" },
          { id: "finance", name: "Finance" },
        ]}
        activeGroupId="default"
        onGroupChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("renders children as right-side actions", () => {
    render(
      <ContextualTopBar title="Dashboard">
        <button>Edit</button>
      </ContextualTopBar>,
    );
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/shell/ContextualTopBar.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ContextualTopBar**

```tsx
// src/components/shell/ContextualTopBar.tsx
"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface GroupInfo {
  id: string;
  name: string;
}

interface ContextualTopBarProps {
  title: string;
  groups?: GroupInfo[];
  activeGroupId?: string;
  onGroupChange?: (id: string) => void;
  children?: ReactNode;
}

export function ContextualTopBar({
  title,
  groups,
  activeGroupId,
  onGroupChange,
  children,
}: ContextualTopBarProps) {
  const [groupOpen, setGroupOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setGroupOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeGroup = groups?.find((g) => g.id === activeGroupId);

  return (
    <header
      className="
        h-[var(--topbar-height)] bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]
        px-4 flex items-center gap-3 flex-shrink-0
      "
    >
      <span className="text-[14px] font-semibold text-[var(--text-primary)]">
        {title}
      </span>

      {groups && groups.length > 1 && (
        <>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setGroupOpen((o) => !o)}
              className="
                flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)]
                rounded-[var(--radius-md)] px-2.5 py-[3px] text-[11px] text-[var(--text-secondary)]
                hover:bg-[var(--bg-tertiary)] transition-colors
              "
            >
              {activeGroup?.name ?? activeGroupId}
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>
            {groupOpen && (
              <div
                className="
                absolute top-full mt-1 left-0 min-w-[140px] bg-[var(--bg-primary)]
                border border-[var(--border)] rounded-[var(--radius-md)]
                shadow-[var(--shadow-lg)] z-50 py-1
              "
              >
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onGroupChange?.(g.id);
                      setGroupOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-1.5 text-[12px] transition-colors
                      ${
                        g.id === activeGroupId
                          ? "text-[var(--brand)] bg-[var(--brand-subtle)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                      }
                    `.trim()}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Right side: page-specific actions */}
      <div className="flex-1" />
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/shell/ContextualTopBar.test.tsx --no-cache`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/ContextualTopBar.tsx src/__tests__/shell/ContextualTopBar.test.tsx
git commit -m "feat: add ContextualTopBar with group selector and action slots"
```

---

### Task 9: AppShell Layout + Wire Into Root Layout

**Files:**

- Create: `src/components/shell/AppShell.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create AppShell component**

```tsx
// src/components/shell/AppShell.tsx
"use client";
import { type ReactNode } from "react";
import { useUser } from "@/contexts/UserContext";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAdmin } = useUser();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-secondary)]">
      <Sidebar isAdmin={isAdmin} />
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update root layout to use AppShell**

In `src/app/layout.tsx`, replace the body content. The current structure wraps children in `ThemeProvider > UserProvider > div`. Change it to `ThemeProvider > UserProvider > ToastProvider > AppShell`:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "MITR AI",
  description: "MITR AI — intelligent query assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-[var(--font-sans)]">
        <ThemeProvider>
          <UserProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify app renders with new shell**

Run: `npm run dev:mock` and open http://localhost:3000.
Expected: Icon sidebar on left, content area fills remaining space. Existing pages still render (may look unstyled in places — that's expected).

- [ ] **Step 4: Commit**

```bash
git add src/components/shell/AppShell.tsx src/app/layout.tsx
git commit -m "feat: wire AppShell with Sidebar into root layout"
```

---

## Phase 2: Chat Page

### Task 10: ChatSplitView Layout

**Files:**

- Create: `src/components/chat/ChatSplitView.tsx`
- Test: `src/__tests__/chat/ChatSplitView.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/chat/ChatSplitView.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ChatSplitView } from "@/components/chat/ChatSplitView";

describe("ChatSplitView", () => {
  it("renders left and right panels", () => {
    render(
      <ChatSplitView
        chatPanel={<div data-testid="chat">Chat</div>}
        dataPanel={<div data-testid="data">Data</div>}
      />,
    );
    expect(screen.getByTestId("chat")).toBeInTheDocument();
    expect(screen.getByTestId("data")).toBeInTheDocument();
  });

  it("renders the divider", () => {
    render(
      <ChatSplitView chatPanel={<div>Chat</div>} dataPanel={<div>Data</div>} />,
    );
    expect(screen.getByTestId("split-divider")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/chat/ChatSplitView.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ChatSplitView**

```tsx
// src/components/chat/ChatSplitView.tsx
"use client";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

interface ChatSplitViewProps {
  chatPanel: ReactNode;
  dataPanel: ReactNode;
  defaultSplit?: number;
  minChatWidth?: number;
  maxChatPercent?: number;
}

export function ChatSplitView({
  chatPanel,
  dataPanel,
  defaultSplit = 36,
  minChatWidth = 280,
  maxChatPercent = 50,
}: ChatSplitViewProps) {
  const [chatPercent, setChatPercent] = useState(defaultSplit);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      const minPercent = (minChatWidth / rect.width) * 100;
      setChatPercent(Math.min(maxChatPercent, Math.max(minPercent, percent)));
    }
    function handleMouseUp() {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minChatWidth, maxChatPercent]);

  const handleDoubleClick = useCallback(() => {
    setChatPercent(defaultSplit);
  }, [defaultSplit]);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Chat panel */}
      <div
        className="flex flex-col overflow-hidden bg-[var(--bg-secondary)]"
        style={{ width: `${chatPercent}%` }}
      >
        {chatPanel}
      </div>

      {/* Divider */}
      <div
        data-testid="split-divider"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="
          w-[5px] cursor-col-resize flex-shrink-0
          bg-[var(--border-subtle)] hover:bg-[var(--brand)]
          transition-colors duration-150
        "
      />

      {/* Data panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-secondary)]">
        {dataPanel}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/chat/ChatSplitView.test.tsx --no-cache`
Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatSplitView.tsx src/__tests__/chat/ChatSplitView.test.tsx
git commit -m "feat: add resizable ChatSplitView layout component"
```

---

### Task 11: CompactMessage Bubble

**Files:**

- Create: `src/components/chat/CompactMessage.tsx`
- Test: `src/__tests__/chat/CompactMessage.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/chat/CompactMessage.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { CompactMessage } from "@/components/chat/CompactMessage";

describe("CompactMessage", () => {
  it("renders user message right-aligned with brand bg", () => {
    render(<CompactMessage role="user" text="show me PNL" />);
    const msg = screen.getByText("show me PNL");
    expect(msg.closest("[data-role]")?.getAttribute("data-role")).toBe("user");
  });

  it("renders bot message with query name", () => {
    render(
      <CompactMessage
        role="bot"
        text="PNL Lineage"
        meta={{ queryName: "pnl-lineage", rowCount: 93, groupCount: 5 }}
      />,
    );
    expect(screen.getByText("PNL Lineage")).toBeInTheDocument();
    expect(screen.getByText(/5 groups/)).toBeInTheDocument();
    expect(screen.getByText(/93 rows/)).toBeInTheDocument();
  });

  it("renders 'View in panel' link for bot messages with data", () => {
    render(
      <CompactMessage
        role="bot"
        text="PNL Lineage"
        meta={{ queryName: "pnl-lineage", rowCount: 93 }}
        onViewInPanel={jest.fn()}
      />,
    );
    expect(screen.getByText(/View in panel/)).toBeInTheDocument();
  });

  it("does not render 'View in panel' without handler", () => {
    render(<CompactMessage role="bot" text="Hello there!" />);
    expect(screen.queryByText(/View in panel/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/chat/CompactMessage.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CompactMessage**

```tsx
// src/components/chat/CompactMessage.tsx
"use client";
import { ArrowRight } from "lucide-react";

interface MessageMeta {
  queryName?: string;
  rowCount?: number;
  groupCount?: number;
  metrics?: Array<{ label: string; value: string; color?: string }>;
}

interface CompactMessageProps {
  role: "user" | "bot";
  text: string;
  meta?: MessageMeta;
  onViewInPanel?: () => void;
}

export function CompactMessage({
  role,
  text,
  meta,
  onViewInPanel,
}: CompactMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end" data-role="user">
        <div className="bg-[var(--brand)] text-[var(--brand-text)] rounded-[12px_12px_4px_12px] px-3 py-2 text-[12px] max-w-[85%]">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" data-role="bot">
      <div className="max-w-[90%]">
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[12px_12px_12px_4px] px-3 py-2">
          <div className="text-[12px] font-medium text-[var(--text-primary)]">
            {text}
          </div>
          {meta && (
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {meta.groupCount && <span>{meta.groupCount} groups</span>}
              {meta.groupCount && meta.rowCount && <span> &middot; </span>}
              {meta.rowCount && <span>{meta.rowCount} rows</span>}
            </div>
          )}
          {meta?.metrics && meta.metrics.length > 0 && (
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {meta.metrics.map((m, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)]"
                  style={{
                    color: m.color ?? "var(--brand)",
                    backgroundColor: m.color
                      ? `${m.color}15`
                      : "var(--brand-subtle)",
                  }}
                >
                  {m.label} {m.value}
                </span>
              ))}
            </div>
          )}
          {onViewInPanel && meta?.queryName && (
            <div className="mt-1.5">
              <button
                onClick={onViewInPanel}
                className="text-[10px] text-[var(--brand)] bg-[var(--brand-subtle)] px-1.5 py-0.5 rounded-[var(--radius-sm)] inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                View in panel <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/chat/CompactMessage.test.tsx --no-cache`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/CompactMessage.tsx src/__tests__/chat/CompactMessage.test.tsx
git commit -m "feat: add CompactMessage bubble with inline metrics and panel link"
```

---

### Task 12: DataPanel Component

**Files:**

- Create: `src/components/chat/DataPanel.tsx`
- Create: `src/components/chat/PinnedDashboard.tsx`
- Test: `src/__tests__/chat/DataPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/chat/DataPanel.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DataPanel } from "@/components/chat/DataPanel";

describe("DataPanel", () => {
  it("shows pinned dashboard when idle", () => {
    render(<DataPanel activeResult={null} />);
    expect(screen.getByText("Pinned Queries")).toBeInTheDocument();
  });

  it("shows result card when active", () => {
    render(
      <DataPanel
        activeResult={{
          queryName: "pnl-lineage",
          title: "PNL Lineage",
          subtitle: "5 groups · 93 rows",
          data: [{ Name: "PNL-FX-001", Value: 1200000 }],
          columns: ["Name", "Value"],
        }}
      />,
    );
    expect(screen.getByText("PNL Lineage")).toBeInTheDocument();
    expect(screen.getByText("5 groups · 93 rows")).toBeInTheDocument();
  });

  it("shows table/chart toggle when active", () => {
    render(
      <DataPanel
        activeResult={{
          queryName: "test",
          title: "Test Query",
          subtitle: "10 rows",
          data: [{ A: 1 }],
          columns: ["A"],
        }}
      />,
    );
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("Chart")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/chat/DataPanel.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Create PinnedDashboard component**

```tsx
// src/components/chat/PinnedDashboard.tsx
"use client";
import { Skeleton } from "@/components/ui/Skeleton";

interface PinnedQuery {
  name: string;
  label: string;
  value?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface PinnedDashboardProps {
  queries?: PinnedQuery[];
  onQueryClick?: (name: string) => void;
}

export function PinnedDashboard({
  queries,
  onQueryClick,
}: PinnedDashboardProps) {
  if (!queries || queries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
          No pinned queries yet
        </div>
        <div className="text-[12px] text-[var(--text-muted)]">
          Pin your favorite queries to see them here
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            Pinned Queries
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Your favorites at a glance
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {queries.map((q) => (
          <button
            key={q.name}
            onClick={() => onQueryClick?.(q.name)}
            className="
              bg-[var(--bg-primary)] rounded-[var(--radius-lg)] p-3
              shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]
              transition-shadow text-left
            "
          >
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              {q.label}
            </div>
            {q.value && (
              <div className="text-[20px] font-bold text-[var(--text-primary)] mt-0.5">
                {q.value}
              </div>
            )}
            {q.change && (
              <div
                className={`text-[11px] mt-0.5 ${
                  q.changeType === "positive"
                    ? "text-[var(--success)]"
                    : q.changeType === "negative"
                      ? "text-[var(--danger)]"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {q.change}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create DataPanel component**

```tsx
// src/components/chat/DataPanel.tsx
"use client";
import { useState } from "react";
import { PinnedDashboard } from "./PinnedDashboard";

interface ActiveResult {
  queryName: string;
  title: string;
  subtitle: string;
  data: Record<string, unknown>[];
  columns: string[];
  executionMs?: number;
}

type ViewMode = "table" | "chart";

interface DataPanelProps {
  activeResult: ActiveResult | null;
  pinnedQueries?: Array<{
    name: string;
    label: string;
    value?: string;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
  }>;
  onPinnedQueryClick?: (name: string) => void;
}

export function DataPanel({
  activeResult,
  pinnedQueries,
  onPinnedQueryClick,
}: DataPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  if (!activeResult) {
    return (
      <PinnedDashboard
        queries={pinnedQueries}
        onQueryClick={onPinnedQueryClick}
      />
    );
  }

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="bg-[var(--bg-primary)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-start">
          <div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">
              {activeResult.title}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {activeResult.subtitle}
            </div>
          </div>
          <div className="flex gap-1">
            {(["table", "chart"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-2.5 py-1 rounded-[var(--radius-md)] text-[11px] font-medium capitalize transition-colors
                  ${
                    viewMode === mode
                      ? "bg-[var(--brand-subtle)] text-[var(--brand)]"
                      : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }
                `}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Data area */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {viewMode === "table" && (
            <div className="text-[11px] border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
              {/* Table header */}
              <div className="flex bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)] font-semibold text-[var(--text-muted)]">
                {activeResult.columns.map((col) => (
                  <div key={col} className="flex-1 px-3 py-2">
                    {col}
                  </div>
                ))}
              </div>
              {/* Table rows */}
              {activeResult.data.slice(0, 50).map((row, i) => (
                <div
                  key={i}
                  className="flex border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  {activeResult.columns.map((col) => (
                    <div key={col} className="flex-1 px-3 py-2">
                      {String(row[col] ?? "")}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {viewMode === "chart" && (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-[13px]">
              Chart view — uses existing DataChart component
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
          <span>
            {activeResult.data.length} rows
            {activeResult.executionMs && ` · ${activeResult.executionMs}ms`}
          </span>
          <div className="flex gap-2">
            <button className="hover:text-[var(--text-secondary)] transition-colors">
              Pin
            </button>
            <button className="hover:text-[var(--text-secondary)] transition-colors">
              Open in Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/__tests__/chat/DataPanel.test.tsx --no-cache`
Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/DataPanel.tsx src/components/chat/PinnedDashboard.tsx src/__tests__/chat/DataPanel.test.tsx
git commit -m "feat: add DataPanel with idle pinned dashboard and active result view"
```

---

### Task 13: Wire Chat Page with New Split View

**Files:**

- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the chat page to use split view with contextual top bar**

Replace `src/app/page.tsx` content. The key changes: remove `AppHeader` (sidebar handles nav now), add `ContextualTopBar`, wrap in `ChatSplitView` with the existing `ChatWindow` on the left and `DataPanel` on the right.

```tsx
// src/app/page.tsx
"use client";
import { useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { ChatSplitView } from "@/components/chat/ChatSplitView";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { DataPanel } from "@/components/chat/DataPanel";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

export default function ChatPage() {
  const { user } = useUser();
  const [groupId, setGroupId] = useState("default");
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeResult, setActiveResult] = useState<{
    queryName: string;
    title: string;
    subtitle: string;
    data: Record<string, unknown>[];
    columns: string[];
    executionMs?: number;
  } | null>(null);

  // Fetch groups on mount
  useState(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch(() => {});
  });

  const handleGroupChange = useCallback((id: string) => {
    setGroupId(id);
    setSessionKey((k) => k + 1);
    setActiveResult(null);
  }, []);

  return (
    <>
      <ContextualTopBar
        title="Chat"
        groups={groups}
        activeGroupId={groupId}
        onGroupChange={handleGroupChange}
      >
        <span className="text-[11px] text-[var(--text-muted)]">
          Cmd+K to search
        </span>
      </ContextualTopBar>

      <ChatSplitView
        chatPanel={
          <ChatWindow
            key={sessionKey}
            platform="web"
            hideHeader
            groupId={groupId}
          />
        }
        dataPanel={<DataPanel activeResult={activeResult} />}
      />

      {showShortcuts && (
        <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}
    </>
  );
}
```

Note: The `ChatWindow` component's `onQueryResult` callback integration (to populate `activeResult`) will be wired in a follow-up task once the existing `useChat` hook is updated to expose result data for the data panel. For now, the split view layout is functional and the data panel shows the idle pinned dashboard state.

- [ ] **Step 2: Verify the chat page renders with split view**

Run: `npm run dev:mock` and open http://localhost:3000.
Expected: Sidebar on left, contextual top bar at top, chat panel on the left ~36% width, data panel on the right ~64% showing "No pinned queries yet".

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire chat page with split view layout and contextual top bar"
```

---

## Phase 3: Dashboard Page

### Task 14: KpiStrip Component

**Files:**

- Create: `src/components/dashboard/KpiStrip.tsx`
- Test: `src/__tests__/dashboard/KpiStrip.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/dashboard/KpiStrip.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { KpiStrip } from "@/components/dashboard/KpiStrip";

describe("KpiStrip", () => {
  it("renders KPI items", () => {
    render(
      <KpiStrip
        items={[
          {
            label: "Total PNL",
            value: "$4.2M",
            change: "+8.3%",
            changeType: "positive",
          },
          {
            label: "Positions",
            value: "1,247",
            change: "-3",
            changeType: "negative",
          },
        ]}
      />,
    );
    expect(screen.getByText("Total PNL")).toBeInTheDocument();
    expect(screen.getByText("$4.2M")).toBeInTheDocument();
    expect(screen.getByText("+8.3%")).toBeInTheDocument();
    expect(screen.getByText("Positions")).toBeInTheDocument();
  });

  it("renders empty state gracefully", () => {
    const { container } = render(<KpiStrip items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/dashboard/KpiStrip.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement KpiStrip**

```tsx
// src/components/dashboard/KpiStrip.tsx
"use client";

interface KpiItem {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

interface KpiStripProps {
  items: KpiItem[];
}

export function KpiStrip({ items }: KpiStripProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex gap-2 px-4 pt-2.5 pb-0 overflow-x-auto">
      {items.map((item) => (
        <div
          key={item.label}
          className="
            flex-1 min-w-[140px] bg-[var(--bg-primary)] rounded-[var(--radius-lg)]
            px-3.5 py-2.5 shadow-[var(--shadow-xs)]
            flex items-center gap-2.5
          "
        >
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              {item.label}
            </div>
            <div className="text-[20px] font-bold text-[var(--text-primary)] leading-tight">
              {item.value}
            </div>
          </div>
          {item.change && (
            <span
              className={`
                text-[11px] px-1.5 py-0.5 rounded-[var(--radius-full)]
                ${
                  item.changeType === "positive"
                    ? "text-[var(--success)] bg-[var(--success-subtle)]"
                    : item.changeType === "negative"
                      ? "text-[var(--danger)] bg-[var(--danger-subtle)]"
                      : "text-[var(--text-muted)] bg-[var(--bg-tertiary)]"
                }
              `.trim()}
            >
              {item.change}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/dashboard/KpiStrip.test.tsx --no-cache`
Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/KpiStrip.tsx src/__tests__/dashboard/KpiStrip.test.tsx
git commit -m "feat: add KpiStrip component for dashboard top"
```

---

### Task 15: CardToolbar (Hover Overlay)

**Files:**

- Create: `src/components/dashboard/CardToolbar.tsx`
- Test: `src/__tests__/dashboard/CardToolbar.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/__tests__/dashboard/CardToolbar.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { CardToolbar } from "@/components/dashboard/CardToolbar";

describe("CardToolbar", () => {
  it("renders action buttons", () => {
    render(
      <CardToolbar
        onRefresh={jest.fn()}
        onMaximize={jest.fn()}
        onSettings={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    expect(screen.getByTitle("Refresh")).toBeInTheDocument();
    expect(screen.getByTitle("Maximize")).toBeInTheDocument();
    expect(screen.getByTitle("Settings")).toBeInTheDocument();
    expect(screen.getByTitle("More")).toBeInTheDocument();
  });

  it("calls onRefresh when refresh clicked", () => {
    const onRefresh = jest.fn();
    render(
      <CardToolbar
        onRefresh={onRefresh}
        onMaximize={jest.fn()}
        onSettings={jest.fn()}
        onMore={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTitle("Refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/dashboard/CardToolbar.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CardToolbar**

```tsx
// src/components/dashboard/CardToolbar.tsx
"use client";
import { RefreshCw, Maximize2, Settings, MoreHorizontal } from "lucide-react";

interface CardToolbarProps {
  onRefresh: () => void;
  onMaximize: () => void;
  onSettings: () => void;
  onMore: () => void;
}

const toolbarBtnClass = `
  w-[26px] h-[26px] bg-[var(--bg-secondary)] border border-[var(--border)]
  rounded-[var(--radius-md)] flex items-center justify-center
  text-[var(--text-muted)] hover:text-[var(--text-secondary)]
  hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer
`;

export function CardToolbar({
  onRefresh,
  onMaximize,
  onSettings,
  onMore,
}: CardToolbarProps) {
  return (
    <div className="flex gap-[3px]">
      <button title="Refresh" onClick={onRefresh} className={toolbarBtnClass}>
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      <button title="Maximize" onClick={onMaximize} className={toolbarBtnClass}>
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <button title="Settings" onClick={onSettings} className={toolbarBtnClass}>
        <Settings className="w-3.5 h-3.5" />
      </button>
      <button title="More" onClick={onMore} className={toolbarBtnClass}>
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/dashboard/CardToolbar.test.tsx --no-cache`
Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/CardToolbar.tsx src/__tests__/dashboard/CardToolbar.test.tsx
git commit -m "feat: add CardToolbar hover overlay for dashboard cards"
```

---

### Task 16: EditModeBar

**Files:**

- Create: `src/components/dashboard/EditModeBar.tsx`

- [ ] **Step 1: Create EditModeBar component**

```tsx
// src/components/dashboard/EditModeBar.tsx
"use client";
import { Button } from "@/components/ui/Button";

interface EditModeBarProps {
  dashboardName: string;
  onAddCard: () => void;
  onAddKpi: () => void;
  onDone: () => void;
}

export function EditModeBar({
  dashboardName,
  onAddCard,
  onAddKpi,
  onDone,
}: EditModeBarProps) {
  return (
    <div className="bg-[var(--brand)] px-4 py-2 flex items-center gap-3">
      <span className="text-[11px] text-white/90 font-medium">
        Editing: {dashboardName}
      </span>
      <div className="flex-1" />
      <button
        onClick={onAddCard}
        className="text-[10px] text-white/80 bg-white/15 hover:bg-white/25 px-2 py-[3px] rounded-[var(--radius-sm)] transition-colors"
      >
        + Add Card
      </button>
      <button
        onClick={onAddKpi}
        className="text-[10px] text-white/80 bg-white/15 hover:bg-white/25 px-2 py-[3px] rounded-[var(--radius-sm)] transition-colors"
      >
        + Add KPI
      </button>
      <button
        onClick={onDone}
        className="text-[10px] text-white font-medium bg-white/25 hover:bg-white/35 px-2.5 py-[3px] rounded-[var(--radius-sm)] transition-colors"
      >
        Done
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/EditModeBar.tsx
git commit -m "feat: add EditModeBar for dashboard edit mode"
```

---

### Task 17: PresentationMode Component

**Files:**

- Create: `src/components/dashboard/PresentationMode.tsx`
- Test: `src/__tests__/dashboard/PresentationMode.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/__tests__/dashboard/PresentationMode.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { PresentationMode } from "@/components/dashboard/PresentationMode";

describe("PresentationMode", () => {
  it("renders full-screen with dashboard name", () => {
    render(
      <PresentationMode
        dashboardName="PNL Overview"
        groupName="finance"
        onExit={jest.fn()}
      >
        <div>Card content</div>
      </PresentationMode>,
    );
    expect(screen.getByText("PNL Overview")).toBeInTheDocument();
    expect(screen.getByText("finance")).toBeInTheDocument();
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("calls onExit when Escape is pressed", () => {
    const onExit = jest.fn();
    render(
      <PresentationMode dashboardName="Test" groupName="test" onExit={onExit}>
        <div>Content</div>
      </PresentationMode>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/dashboard/PresentationMode.test.tsx --no-cache`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement PresentationMode**

```tsx
// src/components/dashboard/PresentationMode.tsx
"use client";
import { useEffect, type ReactNode } from "react";

interface PresentationModeProps {
  dashboardName: string;
  groupName: string;
  onExit: () => void;
  children: ReactNode;
  lastUpdated?: string;
}

export function PresentationMode({
  dashboardName,
  groupName,
  onExit,
  children,
  lastUpdated,
}: PresentationModeProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onExit]);

  return (
    <div className="presentation fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col">
      {/* Minimal top strip */}
      <div className="px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-[var(--brand)] to-[#8b5cf6] rounded-[var(--radius-md)] flex items-center justify-center text-white font-bold text-[9px]">
            C
          </div>
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
            {dashboardName}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {groupName}
          </span>
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">
          {lastUpdated && `Last updated: ${lastUpdated} · `}
          Press Esc to exit
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 pb-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/dashboard/PresentationMode.test.tsx --no-cache`
Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/PresentationMode.tsx src/__tests__/dashboard/PresentationMode.test.tsx
git commit -m "feat: add PresentationMode full-screen component for TV display"
```

---

## Phase 4: Integration & Polish

### Task 18: Update Dashboard Page with New Components

**Files:**

- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/DashboardShell.tsx`

- [ ] **Step 1: Update dashboard page to use contextual top bar**

In `src/app/dashboard/page.tsx`, add `ContextualTopBar` import and render it above the `DashboardShell`. Pass dashboard selector, filter pills, and Edit button as children of the top bar. The DashboardShell should receive new props: `onEditMode`, `editMode`, `onPresentationMode`.

This is an integration step — the exact changes depend on the current state of DashboardShell props. Read the current file, add the ContextualTopBar above the existing DashboardShell render, and pass through the group/dashboard selection props.

- [ ] **Step 2: Add KpiStrip integration into DashboardShell**

In `src/components/dashboard/DashboardShell.tsx`, import `KpiStrip` and render it between the top bar area and the card grid. Derive KPI items from the dashboard's `kpiCards` configuration (already exists in the dashboard type).

- [ ] **Step 3: Add edit mode state and EditModeBar**

In `DashboardShell.tsx`, add `editMode` state. When true, render `EditModeBar` below the top bar. Pass `editMode` to `GridDashboard` so it can show dashed borders and resize handles.

- [ ] **Step 4: Add presentation mode state**

In `DashboardShell.tsx`, add `presentationMode` state. When true, render the entire dashboard content inside `PresentationMode` wrapper.

- [ ] **Step 5: Verify dashboard renders with new layout**

Run: `npm run dev:mock` and navigate to http://localhost:3000/dashboard.
Expected: Sidebar on left, contextual top bar with dashboard name and group, KPI strip (if KPIs configured), card grid below.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/dashboard/DashboardShell.tsx
git commit -m "feat: integrate KpiStrip, EditModeBar, and PresentationMode into dashboard"
```

---

### Task 19: Add Hover Toolbar to QueryCard

**Files:**

- Modify: `src/components/dashboard/QueryCard.tsx`

- [ ] **Step 1: Add hover state and CardToolbar**

In `QueryCard.tsx`, add a `hovered` state tracked via `onMouseEnter`/`onMouseLeave`. When hovered, render `CardToolbar` in the card header. Add the progressive disclosure styling:

- Default: `shadow-[var(--shadow-sm)]` with clean card surface
- Hover: `shadow-[var(--shadow-md)]` + `border-[var(--brand-subtle)]` + toolbar visible
- Edit mode (prop): dashed border `border-2 border-dashed border-[var(--brand-subtle)]`

This is a targeted modification to the existing QueryCard — add the hover detection and conditionally render the toolbar in the header area where the card title and timestamp currently live.

- [ ] **Step 2: Verify hover behavior**

Run: `npm run dev:mock`, navigate to dashboard, hover over a card.
Expected: Card shadow elevates, toolbar icons (refresh, maximize, settings, more) appear in the header.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/QueryCard.tsx
git commit -m "feat: add progressive disclosure hover toolbar to QueryCard"
```

---

### Task 20: Add Slide-In Animation CSS

**Files:**

- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Add animation keyframes to tokens.css**

Append to the end of `src/styles/tokens.css`:

```css
/* Animations */
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-up {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 200ms ease-out;
}

.animate-slide-up {
  animation: slide-up 200ms ease-out;
}

.animate-scale-in {
  animation: scale-in 200ms ease-out;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat: add slide-in, slide-up, and scale-in animation classes"
```

---

### Task 21: Remove Old AppHeader from Chat Page

**Files:**

- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Verify AppHeader is no longer imported in page.tsx**

Run: `grep -r "AppHeader" src/app/page.tsx`
Expected: No matches (was removed in Task 13).

- [ ] **Step 2: Check if AppHeader is used elsewhere**

Run: `grep -r "AppHeader" src/app/ src/components/ --include="*.tsx" --include="*.ts" -l`

If other pages still import AppHeader (data-explorer, gridboard, etc.), leave it in place — those pages will be migrated in future sub-projects. If only page.tsx used it, the file can remain for now since other pages reference it.

- [ ] **Step 3: Commit (if changes made)**

No changes expected in this task — it's a verification step.

---

### Task 22: Final Integration Test

- [ ] **Step 1: Run all unit tests**

Run: `npx jest --passWithNoTests`
Expected: All tests PASS.

- [ ] **Step 2: Run dev server and verify all pages**

Run: `npm run dev:mock`

Verify:

- http://localhost:3000 — Chat page with sidebar + split view
- http://localhost:3000/dashboard — Dashboard with sidebar + KPI strip
- http://localhost:3000/gridboard — Grid Board renders (with sidebar, old content)
- http://localhost:3000/data-explorer — Data Explorer renders (with sidebar, old content)
- http://localhost:3000/admin — Admin panel renders (with sidebar, old content)

- [ ] **Step 3: Test theme switching**

Open browser dev tools console and test theme changes are reflected. Verify light and dark modes apply correct token values.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: No new lint errors from the added files.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration issues from visual redesign"
```

---

## Summary

| Phase          | Tasks        | New Files                    | Modified Files                                        |
| -------------- | ------------ | ---------------------------- | ----------------------------------------------------- |
| 1: Foundation  | Tasks 1-9    | 10 components + 5 tests      | globals.css, layout.tsx, ThemeContext                 |
| 2: Chat        | Tasks 10-13  | 4 components + 3 tests       | page.tsx                                              |
| 3: Dashboard   | Tasks 14-17  | 4 components + 3 tests       | —                                                     |
| 4: Integration | Tasks 18-22  | 0                            | dashboard page, DashboardShell, QueryCard, tokens.css |
| **Total**      | **22 tasks** | **18 components + 11 tests** | **7 existing files**                                  |

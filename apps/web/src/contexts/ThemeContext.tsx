"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { readOfxEmbed } from "@/lib/ofx-embed";

export type Theme = "light" | "dark";

const AVAILABLE_THEMES: readonly Theme[] = ["light", "dark"] as const;

const DARK_THEMES: ReadonlySet<Theme> = new Set<Theme>(["dark"]);

const STORAGE_KEY = "chatbot-theme";

interface ThemeContextValue {
  theme: Theme;
  /** persist: false applies a theme for this page only (One Finance sets it when it frames the widget). */
  setTheme: (t: Theme, opts?: { persist?: boolean }) => void;
  toggleTheme: () => void;
  isDark: boolean;
  availableThemes: readonly Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme {
  try {
    // Framed by One Finance: the console's theme wins over the stored preference.
    const embed = readOfxEmbed(window.location.search);
    if (embed) return embed.theme;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && AVAILABLE_THEMES.includes(stored as Theme))
      return stored as Theme;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
  } catch {
    // localStorage or matchMedia not available
  }
  return "light";
}

function applyThemeClass(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove("dark");
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
  // Lazy initializer runs only on the client (this is a "use client" component),
  // so window/localStorage are available.
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  // Sync the DOM class whenever theme changes (external system update — correct use of effect)
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme, opts?: { persist?: boolean }) => {
    if (opts?.persist !== false) localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
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

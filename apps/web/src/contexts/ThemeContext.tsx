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

/**
 * The look. "steps" (default) paints MITR with the STEPS v3 / One Finance standard (styles/ofx); "ofx" is the
 * classic MITR indigo. Both come from the same tokens file, picked by <html data-skin>.
 */
export type Skin = "steps" | "ofx";

const AVAILABLE_SKINS: readonly Skin[] = ["steps", "ofx"] as const;

const SKIN_KEY = "chatbot-skin";

interface ThemeContextValue {
  theme: Theme;
  /** persist: false applies a theme for this page only (One Finance sets it when it frames the widget). */
  setTheme: (t: Theme, opts?: { persist?: boolean }) => void;
  toggleTheme: () => void;
  isDark: boolean;
  availableThemes: readonly Theme[];
  skin: Skin;
  setSkin: (s: Skin, opts?: { persist?: boolean }) => void;
  availableSkins: readonly Skin[];
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

function readStoredSkin(): Skin {
  try {
    const embed = readOfxEmbed(window.location.search);
    if (embed && AVAILABLE_SKINS.includes(embed.skin as Skin))
      return embed.skin as Skin;
    const stored = localStorage.getItem(SKIN_KEY);
    if (stored && AVAILABLE_SKINS.includes(stored as Skin))
      return stored as Skin;
  } catch {
    // localStorage not available
  }
  return "steps";
}

/** The attributes the shared tokens file reads: MITR's variable names, the skin and the mode. */
function applyLook(theme: Theme, skin: Skin) {
  const el = document.documentElement;
  el.setAttribute("data-ofx-vars", "mitr");
  el.setAttribute("data-skin", skin);
  el.setAttribute("data-theme", DARK_THEMES.has(theme) ? "dark" : "light");
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
  const [skin, setSkinState] = useState<Skin>(() => readStoredSkin());

  // Sync the DOM class whenever theme changes (external system update — correct use of effect)
  useEffect(() => {
    applyThemeClass(theme);
    applyLook(theme, skin);
  }, [theme, skin]);

  const setTheme = useCallback(
    (newTheme: Theme, opts?: { persist?: boolean }) => {
      if (opts?.persist !== false) localStorage.setItem(STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    },
    [],
  );

  const setSkin = useCallback((newSkin: Skin, opts?: { persist?: boolean }) => {
    if (opts?.persist !== false) localStorage.setItem(SKIN_KEY, newSkin);
    setSkinState(newSkin);
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
        skin,
        setSkin,
        availableSkins: AVAILABLE_SKINS,
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

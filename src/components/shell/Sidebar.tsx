"use client";
import {
  useState,
  useCallback,
  useSyncExternalStore,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  Table2,
  Compass,
  BookOpen,
  Eye,
  Settings,
  Shield,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  title: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    icon: <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Chat",
    href: "/",
    title: "Chat",
  },
  {
    icon: <BookOpen className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Catalog",
    href: "/catalog",
    title: "Data Catalog",
  },
  {
    icon: <Eye className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Watch",
    href: "/watch",
    title: "Watch Rules",
  },
  {
    icon: <LayoutDashboard className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Dashboard",
    href: "/dashboard",
    title: "Dashboard",
  },
  {
    icon: <Table2 className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Grid Board",
    href: "/gridboard",
    title: "Grid Board",
  },
  {
    icon: <Compass className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Data Explorer",
    href: "/data-explorer",
    title: "Data Explorer",
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  {
    icon: <Shield className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Admin",
    href: "/admin",
    title: "Admin",
    adminOnly: true,
  },
  {
    icon: <Settings className="w-[18px] h-[18px]" strokeWidth={1.6} />,
    label: "Settings",
    href: "/admin/settings",
    title: "Settings",
  },
];

const PIN_STORAGE_KEY = "chartboard-sidebar-pinned";

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  // Default pinned (Stitch-style wide nav) — user can collapse.
  // Lazy initializer reads localStorage on first render so we don't
  // need a useEffect setState (which the lint guards against).
  const [pinned, setPinned] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setSidebarWidth = useCallback((wide: boolean) => {
    document.documentElement.style.setProperty(
      "--sidebar-current-width",
      wide ? "var(--sidebar-expanded)" : "var(--sidebar-width)",
    );
  }, []);

  // Sync initial width to pinned state
  useEffect(() => {
    setSidebarWidth(pinned);
  }, [pinned, setSidebarWidth]);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(collapseTimer.current);
    if (!pinned) {
      setHovered(true);
      setSidebarWidth(true);
    }
  }, [pinned, setSidebarWidth]);

  const handleMouseLeave = useCallback(() => {
    if (pinned) return;
    collapseTimer.current = setTimeout(() => {
      setHovered(false);
      setSidebarWidth(false);
    }, 240);
  }, [pinned, setSidebarWidth]);

  const togglePin = useCallback(() => {
    setPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PIN_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      setSidebarWidth(next);
      return next;
    });
  }, [setSidebarWidth]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isExpanded = hovered || pinned;

  return (
    <nav
      data-testid="sidebar"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border)] transition-[width,box-shadow] duration-200 ease-out ${
        isExpanded
          ? "w-[var(--sidebar-expanded)] shadow-[var(--shadow-lg)]"
          : "w-[var(--sidebar-width)]"
      }`}
    >
      {/* Brand */}
      <div
        className={`flex items-center gap-2.5 py-4 ${isExpanded ? "px-4" : "px-3 justify-center"}`}
      >
        <div
          className="relative w-[32px] h-[32px] rounded-[10px] flex items-center justify-center shrink-0 shadow-[0_8px_20px_-8px_rgba(99,102,241,0.55)]"
          style={{ background: "var(--brand-gradient)" }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[18px] h-[18px] text-white"
            fill="none"
          >
            <path
              d="M3 7l9-4 9 4-9 4-9-4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M3 12l9 4 9-4M3 17l9 4 9-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              opacity="0.75"
            />
          </svg>
        </div>
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[15px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
              MITR AI
            </h1>
            <p className="eyebrow leading-tight !text-[10px] !tracking-[0.14em] mt-0.5">
              Data Engine
            </p>
          </div>
        )}
      </div>

      {/* Section label */}
      {isExpanded && (
        <div className="px-4 mt-2 mb-1">
          <span className="eyebrow !text-[9px]">Workspace</span>
        </div>
      )}

      {/* Main nav */}
      <div
        className={`flex flex-col gap-0.5 ${isExpanded ? "px-2.5" : "px-2"}`}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              title={item.title}
              onClick={() => router.push(item.href)}
              className={`group relative w-full flex items-center gap-3 rounded-[10px] transition-all duration-150 ${
                isExpanded ? "px-3 py-2" : "px-2 py-2 justify-center"
              } ${
                active
                  ? "bg-[var(--brand-subtle)] text-[var(--brand)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[var(--brand)]" />
              )}
              <span
                className={`flex-shrink-0 transition-colors ${active ? "text-[var(--brand)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"}`}
              >
                {item.icon}
              </span>
              {isExpanded && (
                <span className="text-[13px] font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Footer cluster */}
      <div
        className={`flex flex-col gap-0.5 pb-3 ${isExpanded ? "px-2.5" : "px-2"}`}
      >
        {isExpanded && (
          <div className="px-3 mt-2 mb-1">
            <span className="eyebrow !text-[9px]">Account</span>
          </div>
        )}

        <ThemeToggleButton isExpanded={isExpanded} />

        {BOTTOM_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(
          (item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                title={item.title}
                onClick={() => router.push(item.href)}
                className={`group relative w-full flex items-center gap-3 rounded-[10px] transition-all duration-150 ${
                  isExpanded ? "px-3 py-2" : "px-2 py-2 justify-center"
                } ${
                  active
                    ? "bg-[var(--brand-subtle)] text-[var(--brand)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[var(--brand)]" />
                )}
                <span
                  className={`flex-shrink-0 transition-colors ${active ? "text-[var(--brand)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"}`}
                >
                  {item.icon}
                </span>
                {isExpanded && (
                  <span className="text-[13px] font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          },
        )}

        {/* Pin / collapse toggle */}
        <button
          onClick={togglePin}
          title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
          className={`mt-2 w-full flex items-center gap-3 rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors duration-150 ${
            isExpanded ? "px-3 py-1.5" : "px-2 py-1.5 justify-center"
          }`}
        >
          {pinned ? (
            <PanelLeftClose
              className="w-[16px] h-[16px] flex-shrink-0"
              strokeWidth={1.6}
            />
          ) : (
            <PanelLeftOpen
              className="w-[16px] h-[16px] flex-shrink-0"
              strokeWidth={1.6}
            />
          )}
          {isExpanded && (
            <span className="text-[11.5px] font-medium">
              {pinned ? "Collapse" : "Expand"}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function ThemeToggleButton({ isExpanded }: { isExpanded: boolean }) {
  const { theme, setTheme, isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="w-full flex items-center justify-center py-2">
        <div className="w-[18px] h-[18px]" />
      </div>
    );
  }

  const ThemeIcon = isDark ? Sun : Moon;

  if (!isExpanded) {
    return (
      <button
        title={`Theme: ${theme} (click to toggle)`}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="w-full flex items-center justify-center px-2 py-2 rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ThemeIcon className="w-[18px] h-[18px]" strokeWidth={1.6} />
      </button>
    );
  }

  return (
    <div className="w-full relative">
      <button
        onClick={() => setShowPicker((p) => !p)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ThemeIcon
          className="w-[18px] h-[18px] flex-shrink-0 text-[var(--text-muted)]"
          strokeWidth={1.6}
        />
        <span className="text-[13px] font-medium capitalize">{theme}</span>
      </button>
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-1 w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1 z-50">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTheme(opt.value);
                setShowPicker(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                theme === opt.value
                  ? "text-[var(--brand)] bg-[var(--brand-subtle)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

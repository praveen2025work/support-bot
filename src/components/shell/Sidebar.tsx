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
      className={`fixed left-0 top-0 h-screen z-40 bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col items-center py-3 gap-1 transition-all duration-200 ease-out ${isExpanded ? "w-[var(--sidebar-expanded)] shadow-[var(--shadow-lg)] items-start px-2.5" : "w-[var(--sidebar-width)]"}`}
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
          className={`w-full flex items-center gap-2 rounded-[var(--radius-md)] transition-colors duration-150 ${isExpanded ? "px-2 py-[7px]" : "justify-center py-[7px]"} ${isActive(item.href) ? "bg-[var(--brand-subtle)] text-[var(--brand)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"}`}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {isExpanded && (
            <span className="text-[12px] font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}
        </button>
      ))}

      <div className="flex-1" />

      <div
        className={`h-px bg-[var(--border)] my-1 ${isExpanded ? "w-full" : "w-[30px]"}`}
      />

      {BOTTOM_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
        <button
          key={item.href}
          title={item.title}
          onClick={() => router.push(item.href)}
          className={`w-full flex items-center gap-2 rounded-[var(--radius-md)] transition-colors duration-150 ${isExpanded ? "px-2 py-[7px]" : "justify-center py-[7px]"} ${isActive(item.href) ? "bg-[var(--brand-subtle)] text-[var(--brand)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"}`}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {isExpanded && (
            <span className="text-[12px] font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}
        </button>
      ))}

      {isExpanded && (
        <button
          onClick={() => setPinned((p) => !p)}
          className={`mt-1 w-full flex items-center gap-2 px-2 py-[5px] rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors text-[11px] ${pinned ? "text-[var(--brand)]" : ""}`}
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          <Pin className={`w-3.5 h-3.5 ${pinned ? "fill-current" : ""}`} />
          <span>{pinned ? "Unpin" : "Pin open"}</span>
        </button>
      )}

      <div className="mt-2">
        <div className="w-[26px] h-[26px] rounded-[var(--radius-full)] bg-gradient-to-br from-[var(--brand-subtle)] to-[var(--bg-tertiary)]" />
      </div>
    </nav>
  );
}

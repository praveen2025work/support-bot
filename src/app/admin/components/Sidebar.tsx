"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import {
  FolderKanban,
  Target,
  LayoutTemplate,
  FileText,
  Terminal,
  BarChart3,
  MessageSquare,
  GraduationCap,
  ClipboardList,
  Clock,
  AlertTriangle,
  LayoutGrid,
  Database,
  FileSpreadsheet,
  SlidersHorizontal,
  Users,
  Settings,
  BookOpen,
  Wrench,
  Monitor,
  Container,
  BrainCircuit,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Management",
    items: [
      {
        href: "/admin",
        label: "Groups",
        icon: FolderKanban,
        match: (p: string) => p === "/admin" || p.startsWith("/admin/groups"),
      },
      {
        href: "/admin/intents",
        label: "Intents",
        icon: Target,
        match: (p: string) => p.startsWith("/admin/intents"),
      },
      {
        href: "/admin/templates",
        label: "Templates",
        icon: LayoutTemplate,
        match: (p: string) => p.startsWith("/admin/templates"),
      },
      {
        href: "/admin/files",
        label: "Files",
        icon: FileText,
        match: (p: string) => p.startsWith("/admin/files"),
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        href: "/admin/test-console",
        label: "Test Console",
        icon: Terminal,
        match: (p: string) => p.startsWith("/admin/test-console"),
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        match: (p: string) => p.startsWith("/admin/analytics"),
      },
      {
        href: "/admin/logs",
        label: "Conversation Logs",
        icon: MessageSquare,
        match: (p: string) => p.startsWith("/admin/logs"),
      },
      {
        href: "/admin/learning",
        label: "Learning",
        icon: GraduationCap,
        match: (p: string) => p.startsWith("/admin/learning"),
      },
      {
        href: "/admin/audit",
        label: "Audit Trail",
        icon: ClipboardList,
        match: (p: string) => p.startsWith("/admin/audit"),
      },
      {
        href: "/admin/schedules",
        label: "Schedules",
        icon: Clock,
        match: (p: string) => p.startsWith("/admin/schedules"),
      },
      {
        href: "/admin/anomaly",
        label: "Anomaly Detection",
        icon: AlertTriangle,
        match: (p: string) => p.startsWith("/admin/anomaly"),
      },
      {
        href: "/gridboard",
        label: "Grid Board",
        icon: LayoutGrid,
        match: (p: string) => p.startsWith("/gridboard"),
      },
    ],
  },
  {
    label: "Data Sources",
    items: [
      {
        href: "/admin/connectors",
        label: "SQL Connectors",
        icon: Database,
        match: (p: string) =>
          p.startsWith("/admin/connectors") &&
          !p.startsWith("/admin/connectors/file") &&
          !p.startsWith("/admin/connectors/csv"),
      },
      {
        href: "/admin/connectors/csv",
        label: "CSV / XLSX",
        icon: FileSpreadsheet,
        match: (p: string) =>
          p.startsWith("/admin/connectors/csv") ||
          p.startsWith("/admin/connectors/file"),
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        href: "/admin/filters",
        label: "Filters",
        icon: SlidersHorizontal,
        match: (p: string) => p.startsWith("/admin/filters"),
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        match: (p: string) => p.startsWith("/admin/users"),
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        match: (p: string) => p.startsWith("/admin/settings"),
      },
    ],
  },
  {
    label: "Guides",
    items: [
      {
        href: "/admin/guides/user-guide",
        label: "User Guide",
        icon: BookOpen,
        match: (p: string) => p === "/admin/guides/user-guide",
      },
      {
        href: "/admin/guides/config-guide",
        label: "Config Guide",
        icon: Wrench,
        match: (p: string) => p === "/admin/guides/config-guide",
      },
      {
        href: "/admin/guides/learning-guide",
        label: "Learning & ML",
        icon: BrainCircuit,
        match: (p: string) => p === "/admin/guides/learning-guide",
      },
      {
        href: "/admin/guides/windows-setup",
        label: "Windows Setup",
        icon: Monitor,
        match: (p: string) => p === "/admin/guides/windows-setup",
      },
      {
        href: "/admin/guides/linux-setup",
        label: "Linux Setup",
        icon: Terminal,
        match: (p: string) => p === "/admin/guides/linux-setup",
      },
      {
        href: "/admin/guides/docker-setup",
        label: "Docker Setup",
        icon: Container,
        match: (p: string) => p === "/admin/guides/docker-setup",
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { userInfo, loading: userLoading } = useUser();

  return (
    <aside
      className="w-56 flex flex-col border-r"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="px-4 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <h1
          className="text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Admin
        </h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Bot Platform Dashboard
        </p>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div
              className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.match(pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
                    style={{
                      backgroundColor: isActive
                        ? "color-mix(in srgb, var(--brand) 10%, transparent)"
                        : "transparent",
                      color: isActive
                        ? "var(--brand)"
                        : "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor =
                          "var(--bg-tertiary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Icon
                      size={16}
                      style={{
                        color: isActive ? "var(--brand)" : "var(--text-muted)",
                      }}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {userLoading ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            />
            <div
              className="h-3 w-20 rounded animate-pulse"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            />
          </div>
        ) : userInfo ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "var(--brand)",
                color: "var(--brand-text)",
              }}
            >
              {userInfo.givenName?.[0]}
              {userInfo.surname?.[0]}
            </div>
            <div className="min-w-0">
              <p
                className="text-xs font-medium truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {userInfo.displayName}
              </p>
              <p
                className="text-[10px] truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {userInfo.department || userInfo.role}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

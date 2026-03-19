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
  SlidersHorizontal,
  Users,
  Settings,
  BookOpen,
  Play,
  Rocket,
  Wrench,
  Monitor,
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
        match: (p: string) => p.startsWith("/admin/connectors"),
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
        href: "/admin/guides/demo-setup",
        label: "Demo Setup",
        icon: Play,
        match: (p: string) => p === "/admin/guides/demo-setup",
      },
      {
        href: "/admin/guides/prod-deploy",
        label: "Prod Deploy",
        icon: Rocket,
        match: (p: string) => p === "/admin/guides/prod-deploy",
      },
      {
        href: "/admin/guides/config-guide",
        label: "Config Guide",
        icon: Wrench,
        match: (p: string) => p === "/admin/guides/config-guide",
      },
      {
        href: "/admin/guides/windows-setup",
        label: "Windows Setup",
        icon: Monitor,
        match: (p: string) => p === "/admin/guides/windows-setup",
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { userInfo, loading: userLoading } = useUser();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Admin</h1>
        <p className="text-xs text-gray-500">Bot Platform Dashboard</p>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={isActive ? "text-blue-600" : "text-gray-400"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        {userLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : userInfo ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
              {userInfo.givenName?.[0]}
              {userInfo.surname?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {userInfo.displayName}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {userInfo.department || userInfo.role}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

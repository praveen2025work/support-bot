"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect, useRef } from "react";

interface GroupInfo {
  id: string;
  name: string;
  description: string;
}

export function AppHeader({
  groupId,
  groups,
  onGroupChange,
  extraActions,
}: {
  groupId?: string;
  groups?: GroupInfo[];
  onGroupChange?: (id: string) => void;
  /** Additional action buttons (e.g. + Add Favorite on dashboard) */
  extraActions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { userInfo, isAdmin, loading: userLoading } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header
      className="border-b sticky top-0 z-50"
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
      }}
    >
      <div className="px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            M
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            MITR AI
          </span>
        </Link>

        {/* Group dropdown */}
        {groups && groups.length > 1 && onGroupChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="app-group-select"
              className="text-xs font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Group:
            </label>
            <select
              id="app-group-select"
              value={groupId || ""}
              onChange={(e) => onGroupChange(e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {[
            { href: "/", label: "Chat" },
            { href: "/dashboard", label: "Dashboard" },
            { href: "/gridboard", label: "Grid Board" },
            { href: "/features", label: "Features" },
            ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{
                backgroundColor: isActive(href)
                  ? "hsl(var(--primary) / 0.1)"
                  : "transparent",
                color: isActive(href)
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground))",
              }}
              onMouseEnter={(e) => {
                if (!isActive(href))
                  e.currentTarget.style.backgroundColor = "hsl(var(--muted))";
              }}
              onMouseLeave={(e) => {
                if (!isActive(href))
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right side: extra actions + theme + user */}
        <div className="ml-auto flex items-center gap-2">
          {extraActions}
          <ThemeToggle />

          {/* User avatar / dropdown */}
          <div className="relative" ref={menuRef}>
            {userLoading ? (
              <div
                className="w-7 h-7 rounded-full animate-pulse"
                style={{ backgroundColor: "hsl(var(--muted))" }}
              />
            ) : userInfo ? (
              <>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                  title={userInfo.displayName}
                >
                  {userInfo.givenName?.[0]}
                  {userInfo.surname?.[0]}
                </button>
                {showUserMenu && (
                  <div
                    className="absolute right-0 top-9 w-64 rounded-lg shadow-lg z-50 py-2 border"
                    style={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  >
                    <div
                      className="px-4 py-2 border-b"
                      style={{ borderColor: "hsl(var(--border))" }}
                    >
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {userInfo.displayName}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {userInfo.emailAddress}
                      </p>
                    </div>
                    <div className="px-4 py-2 space-y-1 text-xs">
                      {userInfo.department && (
                        <div className="flex justify-between">
                          <span
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            Department
                          </span>
                          <span style={{ color: "hsl(var(--foreground))" }}>
                            {userInfo.department}
                          </span>
                        </div>
                      )}
                      {userInfo.role && (
                        <div className="flex justify-between">
                          <span
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            Role
                          </span>
                          <span style={{ color: "hsl(var(--foreground))" }}>
                            {userInfo.role}
                          </span>
                        </div>
                      )}
                      {userInfo.location && (
                        <div className="flex justify-between">
                          <span
                            style={{ color: "hsl(var(--muted-foreground))" }}
                          >
                            Location
                          </span>
                          <span style={{ color: "hsl(var(--foreground))" }}>
                            {userInfo.location}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span style={{ color: "hsl(var(--muted-foreground))" }}>
                          Employee ID
                        </span>
                        <span style={{ color: "hsl(var(--foreground))" }}>
                          {userInfo.employeeId}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

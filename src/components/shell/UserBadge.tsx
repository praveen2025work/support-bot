"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";

function initialsOf(name?: string): string {
  if (!name) return "—";
  const parts = name
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Top-right user pill. Renders a placeholder avatar (initials inside a
 * brand-tinted circle) plus a hover-revealed info card. The avatar
 * image hook is intentionally a placeholder — wire to AD photos or
 * Gravatar later by replacing the `<span>` initials with `<img>`.
 */
export function UserBadge() {
  const { userInfo, isAdmin, userRole } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Click-outside dismissal so the panel doesn't linger on touch devices
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const initials = initialsOf(
    userInfo?.displayName ?? userInfo?.name ?? userInfo?.samAccountName,
  );

  const handleEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const handleLeave = () => {
    // Short delay so cursor can travel between trigger and panel
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-1 py-0.5 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
        aria-haspopup="true"
        aria-expanded={open}
        title={userInfo?.displayName ?? userInfo?.samAccountName ?? "Account"}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-semibold text-white shrink-0"
          style={{
            background: "var(--brand-gradient)",
            boxShadow: "0 2px 8px -2px rgba(99,102,241,0.45)",
          }}
        >
          {initials}
        </span>
      </button>

      {open && userInfo && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)] z-50 overflow-hidden animate-slide-up">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border-subtle)]">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold text-white shrink-0"
              style={{ background: "var(--brand-gradient)" }}
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[13.5px] font-bold text-[var(--text-primary)] tracking-tight truncate">
                {userInfo.displayName || userInfo.samAccountName}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono truncate">
                {userInfo.samAccountName}
              </div>
            </div>
          </div>
          <dl className="px-4 py-3 space-y-2 text-[11.5px]">
            {userInfo.emailAddress && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="eyebrow !text-[9px]">Email</dt>
                <dd className="text-[var(--text-secondary)] truncate min-w-0 text-right">
                  {userInfo.emailAddress}
                </dd>
              </div>
            )}
            {userInfo.department && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="eyebrow !text-[9px]">Department</dt>
                <dd className="text-[var(--text-secondary)] truncate min-w-0 text-right">
                  {userInfo.department}
                </dd>
              </div>
            )}
            {userInfo.location && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="eyebrow !text-[9px]">Location</dt>
                <dd className="text-[var(--text-secondary)] truncate min-w-0 text-right">
                  {userInfo.location}
                </dd>
              </div>
            )}
            {userInfo.employeeId && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="eyebrow !text-[9px]">Employee ID</dt>
                <dd className="text-[var(--text-secondary)] font-mono truncate min-w-0 text-right">
                  {userInfo.employeeId}
                </dd>
              </div>
            )}
          </dl>
          <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10.5px]">
            <span className="eyebrow !text-[9px]">Role</span>
            <span
              className={`chip !py-0.5 !px-2 !text-[10px] ${
                isAdmin ? "chip-brand" : ""
              }`}
            >
              {isAdmin ? "Admin" : (userRole ?? "Viewer")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

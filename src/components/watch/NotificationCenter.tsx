"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { AlertCard } from "./AlertCard";
import type { WatchAlert, WatchAlertsResponse } from "@/types/watch";

interface NotificationCenterProps {
  groupId: string;
}

const POLL_INTERVAL_MS = 30_000;

export function NotificationCenter({ groupId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<WatchAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(
          `/api/watch/alerts?groupId=${encodeURIComponent(groupId)}&limit=20`,
          signal ? { signal } : undefined,
        );
        if (!res.ok) return;
        const json: WatchAlertsResponse = await res.json();
        if (json.success) {
          setAlerts(json.data);
          setUnreadCount(json.unreadCount);
        }
      } catch {
        // silently ignore network errors and aborts
      }
    },
    [groupId],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Kick off the first fetch via a resolved promise so the setState calls
    // happen asynchronously (not synchronously within the effect body).
    Promise.resolve().then(() => fetchAlerts(controller.signal));
    const timer = setInterval(
      () => fetchAlerts(controller.signal),
      POLL_INTERVAL_MS,
    );
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [fetchAlerts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/watch/alerts/${id}/read`, { method: "PATCH" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true } : a)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently ignore
    }
  }, []);

  const handleViewData = useCallback((queryName: string) => {
    setOpen(false);
    window.location.href = `/?q=${encodeURIComponent(queryName)}`;
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-[3px] bg-[var(--danger)] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[340px] bg-[var(--bg-primary)] border border-[var(--border-primary,var(--border))] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-[11px] text-[var(--text-muted)]">
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Alert list */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {alerts.length === 0 ? (
              <p className="text-[12px] text-[var(--text-muted)] text-center py-6">
                No recent alerts
              </p>
            ) : (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkRead={handleMarkRead}
                  onViewData={handleViewData}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] px-4 py-2.5">
            <Link
              href="/watch"
              onClick={() => setOpen(false)}
              className="text-[12px] text-[var(--accent)] hover:underline transition-colors"
            >
              View All Rules
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

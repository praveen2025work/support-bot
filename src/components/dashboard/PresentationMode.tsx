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
          {lastUpdated && `Last updated: ${lastUpdated} · `}Press Esc to exit
        </div>
      </div>
      <div className="flex-1 overflow-auto px-5 pb-4">{children}</div>
    </div>
  );
}

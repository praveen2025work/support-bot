"use client";
import { useEffect, useState, type ReactNode } from "react";

interface PresentationModeProps {
  dashboardName: string;
  groupName: string;
  onExit: () => void;
  children: ReactNode;
  lastUpdated?: string;
  pageCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  autoRotateInterval?: number;
}

export function PresentationMode({
  dashboardName,
  groupName,
  onExit,
  children,
  lastUpdated,
  pageCount,
  currentPage,
  onPageChange,
  autoRotateInterval,
}: PresentationModeProps) {
  const [activePage, setActivePage] = useState(currentPage ?? 0);
  const totalPages = pageCount ?? 1;
  const interval = autoRotateInterval ?? 30000;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onExit]);

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setActivePage((p) => (p + 1) % totalPages);
    }, interval);
    return () => clearInterval(timer);
  }, [totalPages, interval]);

  useEffect(() => {
    onPageChange?.(activePage);
  }, [activePage, onPageChange]);

  return (
    <div
      className="presentation fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col"
      data-presentation-mode="true"
    >
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
          {lastUpdated && `Last updated: ${lastUpdated} · `}
          {totalPages > 1 && `Page ${activePage + 1}/${totalPages} · `}
          Press Esc to exit
        </div>
      </div>
      <div className="flex-1 overflow-auto px-5 pb-4">{children}</div>
      {totalPages > 1 && (
        <div className="py-2 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setActivePage(i)}
              className={`rounded-full transition-all duration-200 ${
                i === activePage
                  ? "w-4 h-1.5 bg-[var(--brand)]"
                  : "w-2 h-1.5 bg-[var(--text-muted)] opacity-40 hover:opacity-70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

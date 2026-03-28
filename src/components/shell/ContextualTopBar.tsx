"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface GroupInfo {
  id: string;
  name: string;
}

interface ContextualTopBarProps {
  title: string;
  groups?: GroupInfo[];
  activeGroupId?: string;
  onGroupChange?: (id: string) => void;
  children?: ReactNode;
}

export function ContextualTopBar({
  title,
  groups,
  activeGroupId,
  onGroupChange,
  children,
}: ContextualTopBarProps) {
  const [groupOpen, setGroupOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setGroupOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeGroup = groups?.find((g) => g.id === activeGroupId);

  return (
    <header className="h-[var(--topbar-height)] bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] px-4 flex items-center gap-3 flex-shrink-0">
      <span className="text-[14px] font-semibold text-[var(--text-primary)]">
        {title}
      </span>

      {groups && groups.length > 1 && (
        <>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setGroupOpen((o) => !o)}
              className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] px-2.5 py-[3px] text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {activeGroup?.name ?? activeGroupId}
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>
            {groupOpen && (
              <div className="absolute top-full mt-1 left-0 min-w-[140px] bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 py-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onGroupChange?.(g.id);
                      setGroupOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${g.id === activeGroupId ? "text-[var(--brand)] bg-[var(--brand-subtle)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex-1" />
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

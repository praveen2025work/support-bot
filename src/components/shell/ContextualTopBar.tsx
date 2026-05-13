"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { NotificationCenter } from "@/components/watch/NotificationCenter";
import { UserBadge } from "./UserBadge";

interface GroupInfo {
  id: string;
  name: string;
}

interface ContextualTopBarProps {
  title: string;
  subtitle?: string;
  groups?: GroupInfo[];
  activeGroupId?: string;
  onGroupChange?: (id: string) => void;
  children?: ReactNode;
}

export function ContextualTopBar({
  title,
  subtitle,
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
    <header className="sticky top-0 z-30 h-[var(--topbar-height)] bg-[var(--bg-primary)]/85 backdrop-blur-md border-b border-[var(--border)] px-5 flex items-center gap-3 flex-shrink-0">
      <div className="flex items-center gap-1">
        <span className="font-display text-[15px] font-semibold text-[var(--text-primary)] leading-tight tracking-tight">
          {title}
        </span>
        {subtitle && (
          <span className="text-[12px] text-[var(--text-muted)] ml-2 leading-tight">
            {subtitle}
          </span>
        )}
      </div>

      {groups && groups.length > 1 && (
        <>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setGroupOpen((o) => !o)}
              className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full px-3 py-1 text-[11.5px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-strong)] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
              {activeGroup?.name ?? activeGroupId}
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>
            {groupOpen && (
              <div className="absolute top-full mt-1 left-0 min-w-[160px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 py-1">
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
      <div className="flex items-center gap-2">
        {children}
        <div className="ml-1 pl-2 border-l border-[var(--border)] flex items-center gap-1.5">
          <NotificationCenter groupId={activeGroupId ?? "default"} />
          <UserBadge />
        </div>
      </div>
    </header>
  );
}

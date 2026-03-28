"use client";
import { RefreshCw, Maximize2, Settings, MoreHorizontal } from "lucide-react";

interface CardToolbarProps {
  onRefresh: () => void;
  onMaximize: () => void;
  onSettings: () => void;
  onMore: () => void;
}

const btnClass =
  "w-[26px] h-[26px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer";

export function CardToolbar({
  onRefresh,
  onMaximize,
  onSettings,
  onMore,
}: CardToolbarProps) {
  return (
    <div className="flex gap-[3px]">
      <button title="Refresh" onClick={onRefresh} className={btnClass}>
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      <button title="Maximize" onClick={onMaximize} className={btnClass}>
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <button title="Settings" onClick={onSettings} className={btnClass}>
        <Settings className="w-3.5 h-3.5" />
      </button>
      <button title="More" onClick={onMore} className={btnClass}>
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

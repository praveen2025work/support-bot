"use client";

import { useState, useRef, useEffect } from "react";
import type { EventLinkConfig } from "@/types/dashboard";
import { Settings } from "lucide-react";

interface CardSettingsPopoverProps {
  autoRun: boolean;
  eventLink: EventLinkConfig;
  onUpdate: (partial: {
    autoRun?: boolean;
    eventLink?: EventLinkConfig;
  }) => void;
}

export function CardSettingsPopover({
  autoRun,
  eventLink,
  onUpdate,
}: CardSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-gray-600 rounded"
        title="Card settings"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Card Settings
          </h4>

          {/* Auto-run */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => onUpdate({ autoRun: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-run on load
            </span>
          </label>

          {/* Event link mode */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Cross-card linking
            </label>
            <select
              value={eventLink.mode}
              onChange={(e) =>
                onUpdate({
                  eventLink: {
                    ...eventLink,
                    mode: e.target.value as EventLinkConfig["mode"],
                  },
                })
              }
              className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded"
            >
              <option value="auto">Auto (match by column name)</option>
              <option value="manual">Manual (explicit mappings)</option>
              <option value="disabled">Disabled (ignore events)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Undo2, Clock, ChevronDown, ChevronRight } from "lucide-react";
import type { ChangeEntry } from "@/types/dashboard";

interface ChangeHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: ChangeEntry[];
  onUndo: (entry: ChangeEntry) => void;
}

export function ChangeHistoryPanel({
  isOpen,
  onClose,
  history,
  onUndo,
}: ChangeHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const grouped = history.reduce(
    (acc, entry) => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    },
    {} as Record<string, ChangeEntry[]>,
  );

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Clock size={16} />
          Change History
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No changes recorded yet
          </div>
        ) : (
          Object.entries(grouped)
            .reverse()
            .map(([date, entries]) => (
              <div key={date}>
                <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-750 sticky top-0">
                  {date}
                </div>
                {entries
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() =>
                            setExpandedId(
                              expandedId === entry.id ? null : entry.id,
                            )
                          }
                        >
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                            {expandedId === entry.id ? (
                              <ChevronDown size={12} />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                            <span className="font-medium">{entry.column}</span>
                            <span className="text-gray-400">
                              row {entry.rowIndex + 1}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 ml-4">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <button
                          onClick={() => onUndo(entry)}
                          className="p-1 text-gray-400 hover:text-blue-500 rounded"
                          title="Undo this change"
                        >
                          <Undo2 size={14} />
                        </button>
                      </div>
                      {expandedId === entry.id && (
                        <div className="mt-1 ml-4 text-[11px] space-y-0.5">
                          <div className="text-red-500 line-through truncate">
                            {entry.oldValue || "(empty)"}
                          </div>
                          <div className="text-green-600 truncate">
                            {entry.newValue || "(empty)"}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400">
        {history.length} change{history.length !== 1 ? "s" : ""} recorded
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** If true, only allow single selection (acts like a styled single-select) */
  single?: boolean;
  /** Optional: highlight numeric columns with a badge */
  numericCols?: Set<string>;
  /** Max items before showing "+N more" */
  maxVisible?: number;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  single = false,
  numericCols,
  maxVisible = 2,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (item: string) => {
    if (single) {
      onChange([item]);
      setOpen(false);
      setSearch("");
      return;
    }
    if (selected.includes(item)) {
      const next = selected.filter((s) => s !== item);
      onChange(next);
    } else {
      onChange([...selected, item]);
    }
  };

  const remove = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selected.length <= 1) return; // keep at least one
    onChange(selected.filter((s) => s !== item));
  };

  const visiblePills = selected.slice(0, maxVisible);
  const extraCount = selected.length - maxVisible;

  return (
    <div className="relative" ref={ref}>
      {/* Label */}
      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">
        {label}
      </span>

      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-1 min-w-[120px] max-w-[240px] px-2 py-1
          border rounded-lg text-xs transition-all cursor-pointer
          ${
            open
              ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/40 bg-white dark:bg-gray-700"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
          }
        `}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
          {selected.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500">Select...</span>
          ) : (
            <>
              {visiblePills.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[11px] font-medium max-w-[100px] truncate"
                >
                  {item}
                  {!single && selected.length > 1 && (
                    <X
                      size={10}
                      className="flex-shrink-0 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100"
                      onClick={(e) => remove(item, e)}
                    />
                  )}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  +{extraCount}
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown
          size={12}
          className={`flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl min-w-[180px] max-w-[260px] overflow-hidden">
          {/* Search */}
          {options.length > 5 && (
            <div className="p-1.5 border-b border-gray-100 dark:border-gray-700">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search columns..."
                className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-400"
                autoFocus
              />
            </div>
          )}

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-gray-400 px-2 py-2 text-center">
                No matches
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt);
                const isNumeric = numericCols?.has(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(opt)}
                    className={`
                      w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left
                      ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }
                    `}
                  >
                    {!single && (
                      <span
                        className={`
                          w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-[9px]
                          ${
                            isSelected
                              ? "bg-blue-500 border-blue-500 text-white"
                              : "border-gray-300 dark:border-gray-500"
                          }
                        `}
                      >
                        {isSelected && "✓"}
                      </span>
                    )}
                    <span className="truncate flex-1">{opt}</span>
                    {isNumeric && (
                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded font-medium flex-shrink-0">
                        #
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with count */}
          {!single && selected.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-2 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {selected.length} selected
              </span>
              {selected.length > 1 && (
                <button
                  onClick={() => onChange([selected[0]])}
                  className="text-[10px] text-red-400 hover:text-red-600"
                >
                  Clear extras
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Pin,
  PinOff,
  EyeOff,
  BarChart3,
  Search,
  ChevronDown,
} from "lucide-react";
import type { SortEntry, ClientFilter } from "./grid-helpers";
import { FILTER_OPERATORS } from "./grid-helpers";

interface ColumnHeaderMenuProps {
  column: string;
  sortConfig: SortEntry[];
  isPinned: boolean;
  clientFilter?: ClientFilter;
  groupByColumn: string | null;
  onSort: (col: string, direction: "asc" | "desc", addToMulti: boolean) => void;
  onClearSort: (col: string) => void;
  onPin: (col: string) => void;
  onUnpin: (col: string) => void;
  onHide: (col: string) => void;
  onFilter: (col: string, filter: ClientFilter | null) => void;
  onGroupBy: (col: string | null) => void;
}

export function ColumnHeaderMenu({
  column,
  sortConfig,
  isPinned,
  clientFilter,
  groupByColumn,
  onSort,
  onClearSort,
  onPin,
  onUnpin,
  onHide,
  onFilter,
  onGroupBy,
}: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterOp, setFilterOp] = useState(
    clientFilter?.operator || "contains",
  );
  const [filterVal, setFilterVal] = useState(clientFilter?.value || "");
  const [filterVal2, setFilterVal2] = useState(clientFilter?.value2 || "");
  const menuRef = useRef<HTMLDivElement>(null);

  const currentSort = sortConfig.find((s) => s.column === column);
  const sortIndex = sortConfig.findIndex((s) => s.column === column);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowFilter(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const itemClass =
    "block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 rounded";

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="ml-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Column menu"
      >
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">
          {/* Sort options */}
          <button
            onClick={() => {
              onSort(column, "asc", false);
              setOpen(false);
            }}
            className={itemClass}
          >
            <ArrowUp size={12} className="inline mr-1" /> Sort Ascending
            {currentSort?.direction === "asc" && (
              <Check size={12} className="inline ml-1 text-blue-600" />
            )}
          </button>
          <button
            onClick={() => {
              onSort(column, "desc", false);
              setOpen(false);
            }}
            className={itemClass}
          >
            <ArrowDown size={12} className="inline mr-1" /> Sort Descending
            {currentSort?.direction === "desc" && (
              <Check size={12} className="inline ml-1 text-blue-600" />
            )}
          </button>
          {sortConfig.length > 0 && (
            <>
              <button
                onClick={() => {
                  onSort(column, "asc", true);
                  setOpen(false);
                }}
                className={itemClass}
              >
                <ArrowUp size={12} className="inline mr-1" /> Add to Sort (Asc)
              </button>
              <button
                onClick={() => {
                  onSort(column, "desc", true);
                  setOpen(false);
                }}
                className={itemClass}
              >
                <ArrowDown size={12} className="inline mr-1" /> Add to Sort
                (Desc)
              </button>
            </>
          )}
          {currentSort && (
            <button
              onClick={() => {
                onClearSort(column);
                setOpen(false);
              }}
              className={itemClass}
            >
              <X size={12} className="inline mr-1" /> Clear Sort
              {sortIndex >= 0 && (
                <span className="ml-1 text-gray-400">#{sortIndex + 1}</span>
              )}
            </button>
          )}

          <div className="border-t border-gray-100 my-1" />

          {/* Pin/Unpin */}
          {isPinned ? (
            <button
              onClick={() => {
                onUnpin(column);
                setOpen(false);
              }}
              className={itemClass}
            >
              <PinOff size={12} className="inline mr-1" /> Unpin Column
            </button>
          ) : (
            <button
              onClick={() => {
                onPin(column);
                setOpen(false);
              }}
              className={itemClass}
            >
              <Pin size={12} className="inline mr-1" /> Pin to Left
            </button>
          )}

          {/* Hide */}
          <button
            onClick={() => {
              onHide(column);
              setOpen(false);
            }}
            className={itemClass}
          >
            <EyeOff size={12} className="inline mr-1" /> Hide Column
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Group by */}
          {groupByColumn === column ? (
            <button
              onClick={() => {
                onGroupBy(null);
                setOpen(false);
              }}
              className={itemClass}
            >
              <BarChart3 size={12} className="inline mr-1" /> Remove Grouping
            </button>
          ) : (
            <button
              onClick={() => {
                onGroupBy(column);
                setOpen(false);
              }}
              className={itemClass}
            >
              <BarChart3 size={12} className="inline mr-1" /> Group by this
              Column
            </button>
          )}

          <div className="border-t border-gray-100 my-1" />

          {/* Filter */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={itemClass}
          >
            <Search size={12} className="inline mr-1" /> Filter
            {clientFilter ? " (active)" : ""}
          </button>

          {showFilter && (
            <div className="px-3 py-2 space-y-1.5 border-t border-gray-100">
              <select
                value={filterOp}
                onChange={(e) => setFilterOp(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
              >
                {FILTER_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {filterOp !== "empty" && filterOp !== "notEmpty" && (
                <input
                  value={filterVal}
                  onChange={(e) => setFilterVal(e.target.value)}
                  placeholder="Filter value..."
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onFilter(column, {
                        operator: filterOp,
                        value: filterVal,
                        value2: filterVal2,
                      });
                      setOpen(false);
                      setShowFilter(false);
                    }
                  }}
                />
              )}
              {filterOp === "between" && (
                <input
                  value={filterVal2}
                  onChange={(e) => setFilterVal2(e.target.value)}
                  placeholder="Value 2..."
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                />
              )}
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    onFilter(column, {
                      operator: filterOp,
                      value: filterVal,
                      value2: filterVal2,
                    });
                    setOpen(false);
                    setShowFilter(false);
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply
                </button>
                {clientFilter && (
                  <button
                    onClick={() => {
                      onFilter(column, null);
                      setFilterVal("");
                      setFilterVal2("");
                      setOpen(false);
                      setShowFilter(false);
                    }}
                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import {
  ClipboardList,
  ChevronDown,
  X,
  Save,
  Plus,
  Eye,
  BarChart3,
  Paintbrush,
  Trash2,
  Undo2,
  Download,
  Globe,
  Lock,
  Search,
  Upload,
  History,
  Table2,
  Calculator,
} from "lucide-react";
import type { ConditionalFormatRule, GridBoardView } from "@/types/dashboard";
import { FILTER_OPERATORS } from "./grid-helpers";

// ── Props ──────────────────────────────────────────────────────────

interface GridToolbarProps {
  columns: string[];
  hiddenColumns: Set<string>;
  groupByColumn: string | null;
  selectedCount: number;
  dirtyCount: number;
  deletedCount: number;
  readOnly?: boolean;
  conditionalFormats: ConditionalFormatRule[];
  // View management
  views: GridBoardView[];
  activeView: GridBoardView | null;
  // Callbacks
  onToggleColumn: (col: string) => void;
  onGroupByChange: (col: string | null) => void;
  onDeleteSelected: () => void;
  onAddRow: () => void;
  onSaveChanges: () => void;
  onDiscardChanges: () => void;
  onExport: () => void;
  onToggleSummary: () => void;
  showSummary: boolean;
  // Conditional formatting
  onAddFormat: (rule: Omit<ConditionalFormatRule, "id">) => void;
  onRemoveFormat: (ruleId: string) => void;
  // View callbacks
  onLoadView: (viewId: string) => void;
  onSaveView: () => void;
  onSaveViewAs: (name: string, visibility: "private" | "public") => void;
  onDeleteView: (viewId: string) => void;
  onClearView: () => void;
  // Consolidated features (previously in extra toolbar)
  pivotMode?: boolean;
  onTogglePivot?: () => void;
  showAggregation?: boolean;
  onToggleAggregation?: () => void;
  onToggleFind?: () => void;
  onToggleImport?: () => void;
  showHistory?: boolean;
  onToggleHistory?: () => void;
  saving?: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export function GridToolbar({
  columns,
  hiddenColumns,
  groupByColumn,
  selectedCount,
  dirtyCount,
  deletedCount,
  readOnly,
  conditionalFormats,
  views,
  activeView,
  onToggleColumn,
  onGroupByChange,
  onDeleteSelected,
  onAddRow,
  onSaveChanges,
  onDiscardChanges,
  onExport,
  onToggleSummary,
  showSummary,
  onAddFormat,
  onRemoveFormat,
  onLoadView,
  onSaveView,
  onSaveViewAs,
  onDeleteView,
  onClearView,
  // Consolidated features
  pivotMode = false,
  onTogglePivot,
  showAggregation = false,
  onToggleAggregation,
  onToggleFind,
  onToggleImport,
  showHistory: historyOpen = false,
  onToggleHistory,
  saving = false,
}: GridToolbarProps) {
  const [showColMenu, setShowColMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [showSaveAsInput, setShowSaveAsInput] = useState(false);
  const [saveAsVisibility, setSaveAsVisibility] = useState<
    "private" | "public"
  >("private");

  // Format modal state
  const [fmtCol, setFmtCol] = useState("");
  const [fmtOp, setFmtOp] = useState("gt");
  const [fmtVal, setFmtVal] = useState("");
  const [fmtVal2, setFmtVal2] = useState("");
  const [fmtBg, setFmtBg] = useState("#fef3c7");
  const [fmtColor, setFmtColor] = useState("");
  const [fmtBold, setFmtBold] = useState(false);

  const colMenuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
        setShowColMenu(false);
      if (
        groupMenuRef.current &&
        !groupMenuRef.current.contains(e.target as Node)
      )
        setShowGroupMenu(false);
      if (
        viewMenuRef.current &&
        !viewMenuRef.current.contains(e.target as Node)
      ) {
        setShowViewMenu(false);
        setShowSaveAsInput(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const totalChanges = dirtyCount + deletedCount;

  const btnClass =
    "px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors";
  const btnDefault = `${btnClass} border-gray-300 text-gray-700 bg-white hover:bg-gray-50`;
  const btnPrimary = `${btnClass} border-blue-500 text-white bg-blue-600 hover:bg-blue-700`;
  const btnDanger = `${btnClass} border-red-400 text-red-700 bg-red-50 hover:bg-red-100`;
  const btnSuccess = `${btnClass} border-green-500 text-white bg-green-600 hover:bg-green-700`;

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      {/* View Management */}
      <div className="relative" ref={viewMenuRef}>
        <button
          onClick={() => setShowViewMenu(!showViewMenu)}
          className={btnDefault}
        >
          <ClipboardList size={14} className="inline mr-1" />
          {activeView ? activeView.viewName : "Views"}
          <ChevronDown size={12} className="inline ml-1 text-gray-400" />
        </button>
        {showViewMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
            <div className="p-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Saved Views
              </p>
              {views.length === 0 && (
                <p className="text-xs text-gray-400 italic">No saved views</p>
              )}
              {views.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center justify-between px-2 py-1.5 text-xs rounded cursor-pointer ${
                    activeView?.id === v.id
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="flex items-center gap-1"
                    onClick={() => {
                      onLoadView(v.id);
                      setShowViewMenu(false);
                    }}
                  >
                    {v.visibility === "public" ? (
                      <Globe
                        size={10}
                        className="text-green-500 flex-shrink-0"
                      />
                    ) : (
                      <Lock size={10} className="text-gray-400 flex-shrink-0" />
                    )}
                    {v.viewName}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(v.id);
                    }}
                    className="text-red-400 hover:text-red-600 ml-2"
                    title="Delete view"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-2 space-y-1">
              {activeView && (
                <>
                  <button
                    onClick={() => {
                      onSaveView();
                      setShowViewMenu(false);
                    }}
                    className="block w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 rounded"
                  >
                    <Save size={12} className="inline mr-1" /> Save &quot;
                    {activeView.viewName}&quot;
                  </button>
                  <button
                    onClick={() => {
                      onClearView();
                      setShowViewMenu(false);
                    }}
                    className="block w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 rounded"
                  >
                    <X size={12} className="inline mr-1" /> Clear active view
                  </button>
                </>
              )}
              {!showSaveAsInput ? (
                <button
                  onClick={() => setShowSaveAsInput(true)}
                  className="block w-full text-left px-2 py-1.5 text-xs hover:bg-gray-50 rounded"
                >
                  <Plus size={12} className="inline mr-1" /> Save as new view...
                </button>
              ) : (
                <div className="flex gap-1">
                  <input
                    value={saveAsName}
                    onChange={(e) => setSaveAsName(e.target.value)}
                    placeholder="View name"
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && saveAsName.trim()) {
                        onSaveViewAs(saveAsName.trim(), saveAsVisibility);
                        setSaveAsName("");
                        setSaveAsVisibility("private");
                        setShowSaveAsInput(false);
                        setShowViewMenu(false);
                      }
                    }}
                  />
                  <button
                    onClick={() =>
                      setSaveAsVisibility(
                        saveAsVisibility === "private" ? "public" : "private",
                      )
                    }
                    className={`px-1.5 py-1 rounded text-xs ${
                      saveAsVisibility === "public"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                    title={
                      saveAsVisibility === "public"
                        ? "Public — visible to all users"
                        : "Private — only you"
                    }
                  >
                    {saveAsVisibility === "public" ? (
                      <Globe size={12} />
                    ) : (
                      <Lock size={12} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (saveAsName.trim()) {
                        onSaveViewAs(saveAsName.trim(), saveAsVisibility);
                        setSaveAsName("");
                        setSaveAsVisibility("private");
                        setShowSaveAsInput(false);
                        setShowViewMenu(false);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-300" />

      {/* Column Visibility */}
      <div className="relative" ref={colMenuRef}>
        <button
          onClick={() => setShowColMenu(!showColMenu)}
          className={btnDefault}
        >
          <Eye size={14} className="inline mr-1" /> Columns
          {hiddenColumns.size > 0 && (
            <span className="ml-1 text-xs text-amber-600">
              ({hiddenColumns.size} hidden)
            </span>
          )}
        </button>
        {showColMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto min-w-[180px]">
            <div className="p-2 space-y-0.5">
              {columns.map((col) => (
                <label
                  key={col}
                  className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.has(col)}
                    onChange={() => onToggleColumn(col)}
                    className="rounded border-gray-300"
                  />
                  <span className="truncate">{col}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Group By */}
      <div className="relative" ref={groupMenuRef}>
        <button
          onClick={() => setShowGroupMenu(!showGroupMenu)}
          className={btnDefault}
        >
          <BarChart3 size={14} className="inline mr-1" /> Group
          {groupByColumn ? `: ${groupByColumn}` : ""}
        </button>
        {showGroupMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto min-w-[180px]">
            <div className="p-2 space-y-0.5">
              <button
                onClick={() => {
                  onGroupByChange(null);
                  setShowGroupMenu(false);
                }}
                className={`block w-full text-left px-2 py-1.5 text-xs rounded ${!groupByColumn ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}
              >
                No grouping
              </button>
              {columns.map((col) => (
                <button
                  key={col}
                  onClick={() => {
                    onGroupByChange(col);
                    setShowGroupMenu(false);
                  }}
                  className={`block w-full text-left px-2 py-1.5 text-xs rounded ${groupByColumn === col ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Toggle */}
      <button
        onClick={onToggleSummary}
        className={showSummary ? btnPrimary : btnDefault}
      >
        Σ Summary
      </button>

      {/* Conditional Formatting */}
      <button
        onClick={() => setShowFormatModal(!showFormatModal)}
        className={btnDefault}
      >
        <Paintbrush size={14} className="inline mr-1" /> Format
        {conditionalFormats.length > 0 ? ` (${conditionalFormats.length})` : ""}
      </button>

      <div className="w-px h-5 bg-gray-300" />

      {/* CRUD Actions */}
      {!readOnly && (
        <>
          <button onClick={onAddRow} className={btnDefault}>
            <Plus size={14} className="inline mr-1" /> Add Row
          </button>
          {selectedCount > 0 && (
            <button onClick={onDeleteSelected} className={btnDanger}>
              <Trash2 size={14} className="inline mr-1" /> Delete{" "}
              {selectedCount}
            </button>
          )}
          {totalChanges > 0 && (
            <>
              <button onClick={onSaveChanges} className={btnSuccess}>
                <Save size={14} className="inline mr-1" /> Save {totalChanges}{" "}
                change{totalChanges > 1 ? "s" : ""}
              </button>
              <button onClick={onDiscardChanges} className={btnDefault}>
                <Undo2 size={14} className="inline mr-1" /> Discard
              </button>
            </>
          )}
        </>
      )}

      <div className="w-px h-5 bg-gray-300" />

      {/* Pivot */}
      {onTogglePivot && (
        <button
          onClick={onTogglePivot}
          className={pivotMode ? btnPrimary : btnDefault}
        >
          <Table2 size={14} className="inline mr-1" /> Pivot
        </button>
      )}

      {/* Aggregation */}
      {onToggleAggregation && (
        <button
          onClick={onToggleAggregation}
          className={showAggregation ? btnPrimary : btnDefault}
        >
          <Calculator size={14} className="inline mr-1" /> Aggregation
        </button>
      )}

      {/* Find */}
      {onToggleFind && (
        <button onClick={onToggleFind} className={btnDefault}>
          <Search size={14} className="inline mr-1" /> Find
        </button>
      )}

      {/* Import */}
      {!readOnly && onToggleImport && (
        <button onClick={onToggleImport} className={btnDefault}>
          <Upload size={14} className="inline mr-1" /> Import
        </button>
      )}

      {/* History */}
      {onToggleHistory && (
        <button
          onClick={onToggleHistory}
          className={historyOpen ? btnPrimary : btnDefault}
        >
          <History size={14} className="inline mr-1" /> History
        </button>
      )}

      <div className="flex-1" />

      {saving && (
        <span className="text-xs text-blue-600 font-medium animate-pulse">
          Saving...
        </span>
      )}

      {/* Export */}
      <button onClick={onExport} className={btnDefault}>
        <Download size={14} className="inline mr-1" /> Export CSV
      </button>

      {/* Conditional Formatting Modal */}
      {showFormatModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowFormatModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 w-[420px] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Conditional Formatting Rules
            </h3>

            {/* Existing rules */}
            {conditionalFormats.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {conditionalFormats.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded border"
                        style={{
                          backgroundColor: rule.style.bg || "#fff",
                          borderColor: rule.style.color || "#ccc",
                        }}
                      />
                      <span>
                        <strong>{rule.column}</strong> {rule.operator}{" "}
                        {rule.value}
                        {rule.value2 ? ` – ${rule.value2}` : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemoveFormat(rule.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new rule */}
            <div className="space-y-2 border-t border-gray-200 pt-3">
              <p className="text-xs font-medium text-gray-500">Add Rule</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={fmtCol}
                  onChange={(e) => setFmtCol(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5"
                >
                  <option value="">Column...</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={fmtOp}
                  onChange={(e) => setFmtOp(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5"
                >
                  {FILTER_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={fmtVal}
                  onChange={(e) => setFmtVal(e.target.value)}
                  placeholder="Value"
                  className="text-xs border border-gray-300 rounded px-2 py-1.5"
                />
                {fmtOp === "between" && (
                  <input
                    value={fmtVal2}
                    onChange={(e) => setFmtVal2(e.target.value)}
                    placeholder="Value 2"
                    className="text-xs border border-gray-300 rounded px-2 py-1.5"
                  />
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500">BG:</label>
                <input
                  type="color"
                  value={fmtBg}
                  onChange={(e) => setFmtBg(e.target.value)}
                  className="w-6 h-6 border rounded cursor-pointer"
                />
                <label className="text-xs text-gray-500">Text:</label>
                <input
                  type="color"
                  value={fmtColor || "#000000"}
                  onChange={(e) => setFmtColor(e.target.value)}
                  className="w-6 h-6 border rounded cursor-pointer"
                />
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fmtBold}
                    onChange={(e) => setFmtBold(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Bold
                </label>
              </div>
              <button
                onClick={() => {
                  if (!fmtCol) return;
                  onAddFormat({
                    column: fmtCol,
                    operator: fmtOp as ConditionalFormatRule["operator"],
                    value: fmtVal,
                    value2: fmtOp === "between" ? fmtVal2 : undefined,
                    style: {
                      bg: fmtBg || undefined,
                      color: fmtColor || undefined,
                      bold: fmtBold || undefined,
                    },
                  });
                  setFmtVal("");
                  setFmtVal2("");
                }}
                disabled={!fmtCol}
                className="w-full text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Rule
              </button>
            </div>

            <button
              onClick={() => setShowFormatModal(false)}
              className="mt-3 w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

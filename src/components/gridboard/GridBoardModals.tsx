"use client";

/**
 * Three small modals used by the GridBoard editor:
 *
 *   - BulkEditModal      → set the same value on every selected row
 *   - FormulaEditorModal → add or remove formula columns (e.g. margin = {revenue} - {cost})
 *   - ShortcutsOverlay   → keyboard shortcut help (Ctrl+Z, Ctrl+F, etc.)
 *
 * Kept here so AgEditableDataGrid stays focused on data + state and
 * doesn't grow another ~300 lines of modal JSX.
 */

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { FormulaColumn } from "@/types/dashboard";
import { evaluateFormula } from "./grid-helpers";

// ─── Bulk edit ───────────────────────────────────────────────────────

interface BulkEditModalProps {
  columns: string[];
  selectedCount: number;
  onApply: (column: string, value: string) => void;
  onClose: () => void;
}

export function BulkEditModal({
  columns,
  selectedCount,
  onApply,
  onClose,
}: BulkEditModalProps) {
  const [column, setColumn] = useState(columns[0] ?? "");
  const [value, setValue] = useState("");

  return (
    <ModalShell title={`Bulk edit — ${selectedCount} row(s)`} onClose={onClose}>
      <p className="text-xs text-gray-500 mb-3">
        Set the same value for the selected column on every highlighted row.
        Each cell change becomes its own undo step (Ctrl+Z).
      </p>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Column
      </label>
      <select
        value={column}
        onChange={(e) => setColumn(e.target.value)}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-3"
      >
        {columns.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        New value
      </label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anything — number, string, or blank to clear"
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 mb-4"
      />
      <ModalFooter
        onCancel={onClose}
        confirmLabel={`Set on ${selectedCount} row(s)`}
        confirmDisabled={!column}
        onConfirm={() => onApply(column, value)}
      />
    </ModalShell>
  );
}

// ─── Formula editor ──────────────────────────────────────────────────

interface FormulaEditorModalProps {
  columns: string[];
  rows: Record<string, unknown>[];
  formulas: FormulaColumn[];
  onAdd: (fc: FormulaColumn) => void;
  onRemove: (name: string) => void;
  onClose: () => void;
}

export function FormulaEditorModal({
  columns,
  rows,
  formulas,
  onAdd,
  onRemove,
  onClose,
}: FormulaEditorModalProps) {
  const [name, setName] = useState("");
  const [expression, setExpression] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Live preview against the first row (or the synthesized zero-row).
  const previewRow =
    rows[0] ?? Object.fromEntries(columns.map((c) => [c, "0"]));
  const preview = expression ? evaluateFormula(expression, previewRow) : null;

  const handleAdd = () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (columns.includes(trimmed) || formulas.some((f) => f.name === trimmed)) {
      setError("Name conflicts with an existing column");
      return;
    }
    if (!expression.trim()) {
      setError("Formula expression is required");
      return;
    }
    onAdd({
      id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
      expression,
    });
    setName("");
    setExpression("");
  };

  return (
    <ModalShell title="Formula columns" onClose={onClose} width="500px">
      <p className="text-xs text-gray-500 mb-3">
        Define a computed column. Reference other columns with{" "}
        <code className="bg-gray-100 px-1 rounded">{"{column_name}"}</code>.
        Supports <code>+ - * / % ( )</code>.
      </p>

      {formulas.length > 0 && (
        <div className="mb-4 border border-gray-200 rounded">
          {formulas.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 text-xs"
            >
              <div className="min-w-0">
                <div className="font-semibold text-gray-800 truncate">
                  {f.name}
                </div>
                <code className="text-[11px] text-gray-500 truncate block">
                  {f.expression}
                </code>
              </div>
              <button
                onClick={() => onRemove(f.name)}
                className="text-red-500 hover:text-red-700 text-xs ml-2 shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Column name (e.g. margin)"
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
        />
        <input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="{revenue} - {cost}"
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 font-mono"
        />
        {expression && (
          <div className="text-[11px] text-gray-500">
            Preview against first row:{" "}
            <code className="bg-gray-100 px-1 rounded">{String(preview)}</code>
          </div>
        )}
        {error && <div className="text-[11px] text-red-600">{error}</div>}
      </div>

      <ModalFooter
        onCancel={onClose}
        confirmLabel="Add column"
        onConfirm={handleAdd}
      />
    </ModalShell>
  );
}

// ─── Shortcuts overlay ───────────────────────────────────────────────

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "Ctrl + Z", description: "Undo the last cell edit" },
  { keys: "Ctrl + Shift + Z / Ctrl + Y", description: "Redo" },
  { keys: "Ctrl + F", description: "Open find / replace" },
  { keys: "?", description: "Toggle this shortcuts overlay" },
  { keys: "Esc", description: "Close any open modal" },
  { keys: "Arrow keys", description: "Move between cells" },
  { keys: "Enter / F2", description: "Start editing the focused cell" },
  { keys: "Tab", description: "Move to next cell (commits edit)" },
];

interface ShortcutsOverlayProps {
  onClose: () => void;
}

export function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <ModalShell title="Keyboard shortcuts" onClose={onClose}>
      <table className="w-full text-xs">
        <tbody>
          {SHORTCUTS.map((s) => (
            <tr key={s.keys} className="border-b last:border-b-0">
              <td className="py-1.5 pr-3 font-mono text-gray-700 whitespace-nowrap">
                {s.keys}
              </td>
              <td className="py-1.5 text-gray-600">{s.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ModalShell>
  );
}

// ─── Shared modal primitives ─────────────────────────────────────────

function ModalShell({
  title,
  children,
  onClose,
  width = "420px",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-5 max-h-[80vh] overflow-y-auto"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  onCancel,
  confirmLabel,
  onConfirm,
  confirmDisabled = false,
}: {
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 mt-4">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={confirmDisabled}
        className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, ArrowRight } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingColumns: string[];
  onImport: (
    data: Record<string, unknown>[],
    mode: "append" | "replace",
  ) => void;
}

function parseCsv(text: string): {
  columns: string[];
  rows: Record<string, unknown>[];
} {
  const lines = text.trim().split("\n");
  if (lines.length === 0) return { columns: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? "\t" : ",";

  const columns = lines[0]
    .split(delimiter)
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line
      .split(delimiter)
      .map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      row[col] = values[i] ?? "";
    });
    return row;
  });

  return { columns, rows };
}

export function ImportModal({
  isOpen,
  onClose,
  existingColumns,
  onImport,
}: ImportModalProps) {
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
  } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [mode, setMode] = useState<"append" | "replace">("append");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!pasteText.trim()) return;
    const result = parseCsv(pasteText);
    setParsed(result);
    // Auto-map matching columns
    const mapping: Record<string, string> = {};
    result.columns.forEach((col) => {
      const match = existingColumns.find(
        (ec) => ec.toLowerCase() === col.toLowerCase(),
      );
      if (match) mapping[col] = match;
    });
    setColumnMapping(mapping);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPasteText(text);
      const result = parseCsv(text);
      setParsed(result);
      const mapping: Record<string, string> = {};
      result.columns.forEach((col) => {
        const match = existingColumns.find(
          (ec) => ec.toLowerCase() === col.toLowerCase(),
        );
        if (match) mapping[col] = match;
      });
      setColumnMapping(mapping);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirm = () => {
    if (!parsed) return;
    // Remap columns
    const mappedRows = parsed.rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      Object.entries(row).forEach(([srcCol, val]) => {
        const targetCol = columnMapping[srcCol];
        if (targetCol) mapped[targetCol] = val;
      });
      return mapped;
    });
    onImport(mappedRows, mode);
    setPasteText("");
    setParsed(null);
    setColumnMapping({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Upload size={16} />
            Import Data
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!parsed ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Paste CSV/TSV data
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste tab-separated or comma-separated data here (first row = headers)..."
                  className="w-full h-40 text-xs font-mono border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-300 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleParse}
                  disabled={!pasteText.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Preview
                </button>
                <span className="text-xs text-gray-400">or</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText size={14} />
                  Upload CSV/TSV File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-gray-600">
                Parsed {parsed.rows.length} rows with {parsed.columns.length}{" "}
                columns
              </div>

              {/* Column mapping */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600">
                  Column Mapping
                </div>
                {parsed.columns.map((srcCol) => (
                  <div key={srcCol} className="flex items-center gap-2 text-xs">
                    <span className="w-32 truncate font-mono text-gray-500">
                      {srcCol}
                    </span>
                    <ArrowRight size={12} className="text-gray-300" />
                    <select
                      value={columnMapping[srcCol] || ""}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [srcCol]: e.target.value,
                        }))
                      }
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="">(skip)</option>
                      {existingColumns.map((ec) => (
                        <option key={ec} value={ec}>
                          {ec}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-40">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {parsed.columns.map((col) => (
                        <th
                          key={col}
                          className="px-2 py-1 text-left font-medium text-gray-500 border-b"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {parsed.columns.map((col) => (
                          <td
                            key={col}
                            className="px-2 py-1 truncate max-w-[120px]"
                          >
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > 5 && (
                  <div className="text-center text-[10px] text-gray-400 py-1">
                    ...and {parsed.rows.length - 5} more rows
                  </div>
                )}
              </div>

              {/* Mode selector */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name="importMode"
                    checked={mode === "append"}
                    onChange={() => setMode("append")}
                  />
                  Append rows
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name="importMode"
                    checked={mode === "replace"}
                    onChange={() => setMode("replace")}
                  />
                  Replace all data
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setParsed(null)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={
                    Object.values(columnMapping).filter(Boolean).length === 0
                  }
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Import {parsed.rows.length} rows
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

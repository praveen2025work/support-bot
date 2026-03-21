"use client";

import { useCallback, useRef, useEffect } from "react";

interface GridKeyboardOptions {
  totalRows: number;
  totalCols: number;
  /** Currently focused cell [row, colIndex] */
  focusedCell: [number, number] | null;
  onFocusChange: (row: number, col: number) => void;
  onStartEdit: (row: number, col: number) => void;
  onCancelEdit: () => void;
  isEditing: boolean;
  /** Get cell text value for copy */
  getCellValue: (row: number, col: number) => string;
  /** Called with parsed TSV data on paste */
  onPaste?: (data: string[][], startRow: number, startCol: number) => void;
  /** Undo last action */
  onUndo?: () => void;
  readOnly?: boolean;
}

export function useGridKeyboard({
  totalRows,
  totalCols,
  focusedCell,
  onFocusChange,
  onStartEdit,
  onCancelEdit,
  isEditing,
  getCellValue,
  onPaste,
  onUndo,
  readOnly,
}: GridKeyboardOptions) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!focusedCell) return;
      const [row, col] = focusedCell;
      const meta = e.metaKey || e.ctrlKey;

      // Don't intercept when editing (let input handle it)
      if (isEditing) {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancelEdit();
        } else if (e.key === "Tab") {
          e.preventDefault();
          onCancelEdit();
          const nextCol = e.shiftKey
            ? Math.max(0, col - 1)
            : Math.min(totalCols - 1, col + 1);
          onFocusChange(row, nextCol);
        }
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          onFocusChange(Math.max(0, row - 1), col);
          break;
        case "ArrowDown":
          e.preventDefault();
          onFocusChange(Math.min(totalRows - 1, row + 1), col);
          break;
        case "ArrowLeft":
          e.preventDefault();
          onFocusChange(row, Math.max(0, col - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          onFocusChange(row, Math.min(totalCols - 1, col + 1));
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            onFocusChange(row, Math.max(0, col - 1));
          } else {
            onFocusChange(row, Math.min(totalCols - 1, col + 1));
          }
          break;
        case "Enter":
          e.preventDefault();
          if (!readOnly) onStartEdit(row, col);
          break;
        case "Home":
          e.preventDefault();
          onFocusChange(row, 0);
          break;
        case "End":
          e.preventDefault();
          onFocusChange(row, totalCols - 1);
          break;
        default:
          // Ctrl+C: copy
          if (meta && e.key === "c") {
            e.preventDefault();
            const text = getCellValue(row, col);
            navigator.clipboard.writeText(text).catch(() => {});
          }
          // Ctrl+V: paste
          if (meta && e.key === "v" && !readOnly && onPaste) {
            e.preventDefault();
            navigator.clipboard
              .readText()
              .then((text) => {
                const tsv = text.split("\n").map((line) => line.split("\t"));
                onPaste(tsv, row, col);
              })
              .catch(() => {});
          }
          // Ctrl+Z: undo
          if (meta && e.key === "z" && !readOnly && onUndo) {
            e.preventDefault();
            onUndo();
          }
          break;
      }
    },
    [
      focusedCell,
      isEditing,
      totalRows,
      totalCols,
      onFocusChange,
      onStartEdit,
      onCancelEdit,
      getCellValue,
      onPaste,
      onUndo,
      readOnly,
    ],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { containerRef };
}

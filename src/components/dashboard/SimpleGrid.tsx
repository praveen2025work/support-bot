"use client";

/**
 * SimpleGrid — zero-dependency responsive grid layout with drag-to-reorder and resize.
 * Replaces react-grid-layout for environments where the npm package is unavailable.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface SimpleGridProps {
  layouts: GridItem[];
  cols?: number;
  rowHeight?: number;
  gap?: number;
  readOnly?: boolean;
  onLayoutChange?: (layout: GridItem[]) => void;
  children: ReactNode[];
}

export function SimpleGrid({
  layouts,
  cols = 12,
  rowHeight = 80,
  gap = 16,
  readOnly = false,
  onLayoutChange,
  children,
}: SimpleGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [resizing, setResizing] = useState<{
    id: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    id: string;
    w: number;
    h: number;
  } | null>(null);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Responsive column count
  const effectiveCols =
    containerWidth < 480
      ? 2
      : containerWidth < 768
        ? 4
        : containerWidth < 996
          ? 8
          : cols;
  const colWidth =
    containerWidth > 0
      ? (containerWidth - gap * (effectiveCols - 1)) / effectiveCols
      : 0;

  // Sort layouts by y then x for row-major order
  const sorted = [...layouts].sort((a, b) => a.y - b.y || a.x - b.x);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetId(id);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      setDropTargetId(null);
      setDragId(null);

      if (!dragId || dragId === targetId) return;

      const newLayouts = layouts.map((l) => {
        if (l.i === dragId) {
          const target = layouts.find((t) => t.i === targetId);
          return target ? { ...l, x: target.x, y: target.y } : l;
        }
        if (l.i === targetId) {
          const source = layouts.find((s) => s.i === dragId);
          return source ? { ...l, x: source.x, y: source.y } : l;
        }
        return l;
      });

      onLayoutChange?.(newLayouts);
    },
    [dragId, layouts, onLayoutChange],
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTargetId(null);
  }, []);

  // ── Resize handlers ────────────────────────────────────────────────────────
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const item = layouts.find((l) => l.i === id);
      if (!item) return;
      setResizing({
        id,
        startX: e.clientX,
        startY: e.clientY,
        startW: item.w,
        startH: item.h,
      });
      setResizePreview({ id, w: item.w, h: item.h });
    },
    [layouts],
  );

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizing.startX;
      const deltaY = e.clientY - resizing.startY;

      const item = layouts.find((l) => l.i === resizing.id);
      const minW = item?.minW ?? 2;
      const minH = item?.minH ?? 2;

      // Convert pixel deltas to grid units
      const deltaCols = Math.round(deltaX / (colWidth + gap));
      const deltaRows = Math.round(deltaY / rowHeight);

      const newW = Math.max(
        minW,
        Math.min(effectiveCols, resizing.startW + deltaCols),
      );
      const newH = Math.max(minH, resizing.startH + deltaRows);

      setResizePreview({ id: resizing.id, w: newW, h: newH });
    };

    const handleMouseUp = () => {
      if (resizePreview) {
        const newLayouts = layouts.map((l) =>
          l.i === resizing.id
            ? { ...l, w: resizePreview.w, h: resizePreview.h }
            : l,
        );
        onLayoutChange?.(newLayouts);
      }
      setResizing(null);
      setResizePreview(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    resizing,
    resizePreview,
    layouts,
    onLayoutChange,
    colWidth,
    gap,
    rowHeight,
    effectiveCols,
  ]);

  // Compute child map by key
  const childMap = new Map<string, ReactNode>();
  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (
      child &&
      typeof child === "object" &&
      "key" in child &&
      child.key != null
    ) {
      childMap.set(String(child.key), child);
    }
  });

  return (
    <div
      ref={containerRef}
      className="simple-grid-layout layout"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${effectiveCols}, 1fr)`,
        gap: `${gap}px`,
        width: "100%",
      }}
    >
      {sorted.map((item) => {
        const child = childMap.get(item.i);
        if (!child) return null;

        const previewW =
          resizePreview?.id === item.i ? resizePreview.w : item.w;
        const previewH =
          resizePreview?.id === item.i ? resizePreview.h : item.h;
        const spanW = Math.min(previewW, effectiveCols);
        const isDragging = dragId === item.i;
        const isDropTarget = dropTargetId === item.i;
        const isResizing = resizing?.id === item.i;

        return (
          <div
            key={item.i}
            className={`simple-grid-item${isDragging ? " dragging" : ""}${isDropTarget ? " drop-target" : ""}`}
            style={{
              gridColumn: `span ${spanW}`,
              height: `${previewH * rowHeight}px`,
              opacity: isDragging ? 0.5 : 1,
              outline: isDropTarget
                ? "2px dashed #3b82f6"
                : isResizing
                  ? "2px solid #3b82f6"
                  : "none",
              outlineOffset: "2px",
              transition: isResizing ? "none" : "opacity 150ms, outline 150ms",
              position: "relative",
              overflow: "hidden",
            }}
            draggable={!isResizing && !readOnly}
            onDragStart={
              readOnly ? undefined : (e) => handleDragStart(e, item.i)
            }
            onDragOver={readOnly ? undefined : (e) => handleDragOver(e, item.i)}
            onDragLeave={readOnly ? undefined : handleDragLeave}
            onDrop={readOnly ? undefined : (e) => handleDrop(e, item.i)}
            onDragEnd={readOnly ? undefined : handleDragEnd}
          >
            {child}
            {/* Resize handle — hidden in readOnly mode */}
            {!readOnly && (
              <div
                className="resize-handle"
                onMouseDown={(e) => handleResizeStart(e, item.i)}
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 20,
                  height: 20,
                  cursor: "se-resize",
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "inherit",
                }}
                title="Drag to resize"
              >
                <GripVertical size={10} style={{ opacity: 0.4 }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

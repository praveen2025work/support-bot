"use client";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

interface ChatSplitViewProps {
  chatPanel: ReactNode;
  dataPanel: ReactNode;
  defaultSplit?: number;
  minChatWidth?: number;
  maxChatPercent?: number;
}

export function ChatSplitView({
  chatPanel,
  dataPanel,
  defaultSplit = 36,
  minChatWidth = 280,
  maxChatPercent = 50,
}: ChatSplitViewProps) {
  const [chatPercent, setChatPercent] = useState(defaultSplit);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      const minPercent = (minChatWidth / rect.width) * 100;
      setChatPercent(Math.min(maxChatPercent, Math.max(minPercent, percent)));
    }
    function handleMouseUp() {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minChatWidth, maxChatPercent]);

  const handleDoubleClick = useCallback(() => {
    setChatPercent(defaultSplit);
  }, [defaultSplit]);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      <div
        className="flex flex-col overflow-hidden bg-[var(--bg-secondary)]"
        style={{ width: `${chatPercent}%` }}
      >
        {chatPanel}
      </div>
      <div
        data-testid="split-divider"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="w-[5px] cursor-col-resize flex-shrink-0 bg-[var(--border-subtle)] hover:bg-[var(--brand)] transition-colors duration-150"
      />
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-secondary)]">
        {dataPanel}
      </div>
    </div>
  );
}

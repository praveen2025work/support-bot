"use client";

import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { GridBoardShell } from "@/components/gridboard/GridBoardShell";

export default function GridBoardPage() {
  return (
    <div className="h-screen flex flex-col">
      <ContextualTopBar title="Grid Board">
        {/* Portal target: GridBoardShell renders the query selector and
            Load Data button here via createPortal so state stays co-located. */}
        <div id="gridboard-topbar-slot" />
      </ContextualTopBar>
      <GridBoardShell />
    </div>
  );
}

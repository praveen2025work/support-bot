"use client";

import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { GridBoardShell } from "@/components/gridboard/GridBoardShell";

export default function GridBoardPage() {
  return (
    <div className="h-screen flex flex-col">
      <ContextualTopBar title="Grid Board" />
      <GridBoardShell />
    </div>
  );
}

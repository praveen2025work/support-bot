"use client";

import { AppHeader } from "@/components/AppHeader";
import { GridBoardShell } from "@/components/gridboard/GridBoardShell";

export default function GridBoardPage() {
  return (
    <div className="h-screen flex flex-col">
      <AppHeader />
      <GridBoardShell />
    </div>
  );
}

"use client";

import { Suspense } from "react";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
import { GridBoardShell } from "@/components/gridboard/GridBoardShell";

function GridBoardPageInner() {
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

export default function GridBoardPage() {
  // GridBoardShell uses useSearchParams() to read the ?query= param
  // on load. Next.js's static prerender pass requires that to be
  // wrapped in <Suspense>, otherwise the build fails with a missing
  // suspense boundary error.
  return (
    <Suspense fallback={<div />}>
      <GridBoardPageInner />
    </Suspense>
  );
}

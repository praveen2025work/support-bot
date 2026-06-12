"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CatalogGrid from "@/components/catalog/CatalogGrid";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";

function CatalogPageInner() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") || "default";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)]">
      <ContextualTopBar
        title="Catalog"
        subtitle="Browse every dataset, query, and document"
      />
      <div className="flex-1 overflow-hidden px-6 py-5">
        <CatalogGrid groupId={groupId} />
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense>
      <CatalogPageInner />
    </Suspense>
  );
}

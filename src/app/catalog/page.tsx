"use client";

import { useSearchParams } from "next/navigation";
import CatalogGrid from "@/components/catalog/CatalogGrid";

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") || "default";

  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-xl font-semibold mb-4">Data Catalog</h1>
      <CatalogGrid groupId={groupId} />
    </div>
  );
}

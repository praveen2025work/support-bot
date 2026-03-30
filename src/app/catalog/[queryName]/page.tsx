"use client";

import { useSearchParams, useParams } from "next/navigation";
import CatalogDetailPanel from "@/components/catalog/CatalogDetailPanel";

export default function CatalogDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryName = params.queryName as string;
  const groupId = searchParams.get("groupId") || "default";

  return <CatalogDetailPanel queryName={queryName} groupId={groupId} />;
}

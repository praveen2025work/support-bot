"use client";

import { useSearchParams } from "next/navigation";
import { HomeFeed } from "@/components/home/HomeFeed";

export default function HomePage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") || "default";
  const userId = searchParams.get("userId") || "anonymous";

  return <HomeFeed groupId={groupId} userId={userId} />;
}

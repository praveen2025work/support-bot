"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useUser } from "@/contexts/UserContext";
import { readOfxEmbed } from "@/lib/ofx-embed";

function WidgetContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("group") || undefined;
  // Framed by One Finance: the console's panel already names the bot, so drop the widget's own title bar.
  const framed = readOfxEmbed(searchParams.toString()) !== null;
  const { userInfo } = useUser();

  return (
    <div className="h-full w-full">
      <ChatWindow
        platform="widget"
        groupId={groupId}
        userName={userInfo?.samAccountName}
        hideHeader={framed}
      />
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense>
      <WidgetContent />
    </Suspense>
  );
}

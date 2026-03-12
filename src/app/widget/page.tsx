'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useUser } from '@/contexts/UserContext';

function WidgetContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('group') || undefined;
  const { userInfo } = useUser();

  return (
    <div className="h-full w-full">
      <ChatWindow platform="widget" groupId={groupId} userName={userInfo?.samAccountName} />
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

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

function DashboardPage() {
  const searchParams = useSearchParams();
  const initialGroup = searchParams.get('group') || 'default';
  const dashboardId = searchParams.get('id') || undefined;
  const { userInfo, loading: userLoading } = useUser();

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <DashboardShell
      userId={userInfo?.samAccountName}
      userName={userInfo?.displayName}
      initialGroupId={initialGroup}
      dashboardId={dashboardId}
    />
  );
}

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}

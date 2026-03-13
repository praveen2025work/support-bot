'use client';

import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, userRole, loading } = useUser();
  // Allow any registered user (admin, builder, viewer) into the admin panel
  const hasAccess = isAdmin || !!userRole;
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/');
    }
  }, [loading, hasAccess, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-500">Checking access...</p>
        </div>
      </div>
    );
  }

  // No access — redirecting
  if (!hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Access Denied</p>
          <p className="mt-1 text-sm text-gray-500">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

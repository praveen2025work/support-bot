'use client';

import { OnboardForm } from '@/components/admin/OnboardForm';

export default function OnboardPage() {
  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      <OnboardForm
        backUrl="/"
        successUrl={(groupId) => `/?group=${groupId}`}
      />
    </main>
  );
}

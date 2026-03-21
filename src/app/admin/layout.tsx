"use client";

import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatbotWidget } from "./components/ChatbotWidget";
import { AppHeader } from "@/components/AppHeader";
import { ScrollToTop } from "@/components/shared/ScrollToTop";

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
      router.replace("/");
    }
  }, [loading, hasAccess, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{
              borderColor: "hsl(var(--primary))",
              borderTopColor: "transparent",
            }}
          />
          <p
            className="mt-2 text-sm"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  // No access — redirecting
  if (!hasAccess) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
        <div className="text-center">
          <p
            className="text-lg font-semibold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Access Denied
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            You do not have admin privileges.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-auto p-6"
          style={{ backgroundColor: "hsl(var(--background))" }}
        >
          {children}
          <ScrollToTop />
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}

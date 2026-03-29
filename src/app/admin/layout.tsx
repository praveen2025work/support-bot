"use client";

import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatbotWidget } from "./components/ChatbotWidget";
import { ContextualTopBar } from "@/components/shell/ContextualTopBar";
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
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{
              borderColor: "var(--brand)",
              borderTopColor: "transparent",
            }}
          />
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
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
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="text-center">
          <p
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Access Denied
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            You do not have admin privileges.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <ContextualTopBar title="Admin" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex-1 overflow-auto p-6"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          {children}
          <ScrollToTop />
        </main>
      </div>
      <ChatbotWidget />
    </div>
  );
}

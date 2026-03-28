"use client";
import { type ReactNode } from "react";
import { useUser } from "@/contexts/UserContext";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAdmin } = useUser();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-secondary)]">
      <Sidebar isAdmin={isAdmin} />
      <main
        className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </div>
  );
}

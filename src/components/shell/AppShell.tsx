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
    <div className="flex h-screen overflow-hidden bg-[var(--bg-canvas)]">
      <Sidebar isAdmin={isAdmin} />
      <main
        className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden animate-slide-up transition-[margin-left] duration-200 ease-out relative"
        style={{
          marginLeft: "var(--sidebar-current-width, var(--sidebar-width))",
        }}
      >
        {children}
      </main>
    </div>
  );
}

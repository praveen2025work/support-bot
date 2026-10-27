"use client";
import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAdmin } = useUser();
  const pathname = usePathname();

  // The widget is framed by other apps (One Finance, embed snippets): no sidebar inside the frame.
  if (pathname?.startsWith("/widget")) return <>{children}</>;

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

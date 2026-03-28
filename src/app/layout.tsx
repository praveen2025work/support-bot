import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "MITR AI",
  description: "MITR AI — intelligent query assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-[var(--font-sans)]">
        <ThemeProvider>
          <UserProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

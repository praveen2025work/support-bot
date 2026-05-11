import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MITR AI — Smarter Analytics, Zero License Cost",
  description:
    "MITR AI replaces expensive BI tools like Power BI and Tableau with natural-language analytics your team already knows how to use.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-[var(--font-sans)]">
      {children}
    </div>
  );
}

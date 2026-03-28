export const metadata = {
  title: "MITR AI Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout already provides <html>, <body>, UserProvider, and globals.css
  return <div className="h-full bg-[var(--bg-secondary)]">{children}</div>;
}

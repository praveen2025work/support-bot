import type { Metadata } from 'next';
import { UserProvider } from '@/contexts/UserContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'MITR AI',
  description: 'MITR AI — intelligent query assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <ThemeProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>
        {/* Widget embed script removed — admin pages use ChatbotWidget component,
            external sites use the embed code from Admin > Groups page */}
      </body>
    </html>
  );
}

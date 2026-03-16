import type { Metadata } from 'next';
import Script from 'next/script';
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
        {/* Embedded widget for testing — mirrors what customers see on their sites */}
        <Script id="chatbot-widget-config" strategy="lazyOnload">
          {`
            if (!window.location.pathname.startsWith('/widget')) {
              window.ChatbotWidgetConfig = {
                group: 'default',
                theme: 'blue',
                position: 'bottom-right',
                iconType: 'bot',
                greeting: 'Hi! Need help? Ask me anything.',
              };
              var s = document.createElement('script');
              s.src = '/widget/chatbot-widget.js';
              document.body.appendChild(s);
            }
          `}
        </Script>
      </body>
    </html>
  );
}

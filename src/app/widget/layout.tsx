import { UserProvider } from '@/contexts/UserContext';
import '../globals.css';

export const metadata = {
  title: 'Chatbot Widget',
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0 p-0 overflow-hidden">
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}

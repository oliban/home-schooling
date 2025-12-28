import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/LanguageContext';
import { RechartsWarningFilter } from '@/lib/RechartsWarningFilter';

export const metadata: Metadata = {
  title: 'Brainrot-skolan - Läxor för barn',
  description: 'Matte och läsförståelse baserat på LGR 22',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50">
        <RechartsWarningFilter />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

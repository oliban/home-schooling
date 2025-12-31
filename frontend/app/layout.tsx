import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/LanguageContext';
import { RechartsWarningFilter } from '@/lib/RechartsWarningFilter';

export const metadata: Metadata = {
  title: 'Brainrot-skolan - Läxor för barn',
  description: 'Matte och läsförståelse baserat på LGR 22',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
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

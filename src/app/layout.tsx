import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { RoleProvider } from '@/lib/context/role-context';
import { ToastProvider } from '@/components/Toast';
import { ThemeProvider } from '@/lib/context/theme-context';
import Navbar from '@/components/Navbar';
import { Suspense } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BrandSentry — Pre-Publication Brand Governance & Compliance',
  description: 'AI-assisted and rule-based pre-publication governance for brand integrity, legal compliance, and accessibility.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} light h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans transition-colors duration-200">
        <ThemeProvider>
          <RoleProvider>
            <ToastProvider>
              {/* Skip to Content link for keyboard accessibility */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-zinc-950 focus:rounded-lg focus:font-semibold focus:shadow-xl text-xs focus:ring-2 focus:ring-blue-500"
              >
                Skip to main content
              </a>
              <Suspense fallback={<div className="h-14 border-b border-white/[0.06] bg-[#09090b]" />}>
                <Navbar />
              </Suspense>
              <main id="main-content" tabIndex={-1} className="flex-1 pb-16 focus:outline-none">
                {children}
              </main>
            </ToastProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

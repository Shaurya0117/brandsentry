import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { RoleProvider } from '@/lib/context/role-context';
import { ToastProvider } from '@/components/Toast';
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
        <RoleProvider>
          <ToastProvider>
            <Suspense fallback={<div className="h-16 border-b border-slate-800 bg-slate-950" />}>
              <Navbar />
            </Suspense>
            <main className="flex-1 pb-16">{children}</main>
          </ToastProvider>
        </RoleProvider>
      </body>
    </html>
  );
}

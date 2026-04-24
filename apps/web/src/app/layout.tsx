import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cormorant_Garamond, Manrope } from 'next/font/google';

import { AuthProvider } from '@/components/auth-provider';
import { ObservabilityProvider } from '@/components/observability-provider';

import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'AURA',
  description: 'CRM, agenda, contratos e comunicação para maquiadoras e penteadistas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} ${cormorant.variable}`}>
        <ObservabilityProvider>
          <AuthProvider>{children}</AuthProvider>
        </ObservabilityProvider>
      </body>
    </html>
  );
}

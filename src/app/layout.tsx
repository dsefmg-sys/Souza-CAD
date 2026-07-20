import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import AuthGate from '@/components/AuthGate';
import ThemeInit from '@/components/ThemeInit';
import DialogosHost from '@/components/DialogosHost';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Souza CAD — Peças técnicas de georreferenciamento',
  description: 'Importa TXT/DXF, calcula área SGL e gera memorial, planilha SIGEF, planta e requerimento.',
  other: {
    'color-scheme': 'dark light',
    'darkreader-lock': 'true',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeInit />
        <AuthGate>{children}</AuthGate>
        <DialogosHost />
      </body>
    </html>
  );
}


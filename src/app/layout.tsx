import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import AuthGate from '@/components/AuthGate';
import ThemeInit from '@/components/ThemeInit';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Souza CAD — Peças técnicas de georreferenciamento',
  description: 'Importa TXT/DXF, calcula área SGL e gera memorial, planilha SIGEF, planta e requerimento.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body><ThemeInit /><AuthGate>{children}</AuthGate></body>
    </html>
  );
}

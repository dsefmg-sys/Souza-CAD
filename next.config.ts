import type { NextConfig } from 'next';

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  // Servir num caminho (ex.: /souzacad). Para subdomínio próprio, deixe vazio.
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Roda local; libera acesso de outros aparelhos na rede pra testar no celular.
  allowedDevOrigins: ['192.168.0.*', 'localhost', '127.0.0.1'],
};

export default nextConfig;

import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // Servir num caminho (ex.: /souzacad). Para subdomínio próprio, deixe vazio.
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  // Roda local; libera acesso de outros aparelhos na rede pra testar no celular.
  allowedDevOrigins: ['192.168.0.*', 'localhost', '127.0.0.1'],
};

export default nextConfig;

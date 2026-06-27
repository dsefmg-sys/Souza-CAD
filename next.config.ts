import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  // Roda local; libera acesso de outros aparelhos na rede pra testar no celular.
  allowedDevOrigins: ['192.168.0.*', 'localhost', '127.0.0.1'],
};

export default nextConfig;

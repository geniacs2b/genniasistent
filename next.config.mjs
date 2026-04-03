/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // CRÍTICO para Vercel + Puppeteer:
  // - Next.js 14.2.x requiere serverExternalPackages dentro de 'experimental'.
  //   (Desde Next.js 15 es top-level, pero este proyecto usa 14.2.35).
  // - Sin esto, webpack bundlea los binarios de Chromium y executablePath() falla.
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
};

export default nextConfig;

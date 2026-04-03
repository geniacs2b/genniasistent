/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // CRÍTICO: puppeteer-core y @sparticuz/chromium NO deben ser bundleados por webpack.
  // Si se bundlean, executablePath() falla al localizar el binario de Chromium en /tmp.
  // serverExternalPackages es top-level desde Next.js 14.2.0 (ya no es experimental).
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;

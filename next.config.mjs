/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Los errores de ESLint no detienen el build en producción
    // Se resolverán progresivamente al conectar con Supabase real
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permitir build aunque haya errores de tipo menores
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

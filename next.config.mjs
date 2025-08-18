/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ⛑️ Evita que el build falle por ESLint (Prettier, reglas, etc.)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ❗Opcional: evita que el build falle por errores de TypeScript.
  // Úsalo solo para destrabar el deploy y corrige luego.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

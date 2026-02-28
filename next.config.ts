import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mitiga ChunkLoadError (timeout) en dev/prod según reportes de la comunidad
  expireTime: 0,
  experimental: {
    // Reduce bundle: solo se cargan los módulos usados (menos JS no usado en Lighthouse)
    optimizePackageImports: ["framer-motion"],
  },
  webpack: (config) => {
    // Evitar ChunkLoadError (timeout) en dev o redes lentas
    config.output = config.output ?? {};
    (config.output as { chunkLoadTimeout?: number }).chunkLoadTimeout = 60000;
    return config;
  },
};

export default nextConfig;

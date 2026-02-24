import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reduce bundle: solo se cargan los módulos usados (menos JS no usado en Lighthouse)
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;

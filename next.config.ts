import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["motion", "@radix-ui/react-select"],
  },
};

export default nextConfig;

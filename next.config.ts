import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set an empty turbopack config to silence warnings
  turbopack: {},
  
  // Transpile Reown/AppKit packages  
  transpilePackages: [
    "@reown/appkit",
    "@reown/appkit-controllers",
    "@reown/appkit-utils",
  ],
};

export default nextConfig;

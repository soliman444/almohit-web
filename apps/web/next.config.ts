import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@almohit/contracts",
    "@almohit/validation",
    "@almohit/config",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
};

export default nextConfig;

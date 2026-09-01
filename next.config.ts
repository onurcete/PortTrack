import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/privacy",
        destination: "/gizlilik-politikasi",
      },
    ];
  },
};

export default nextConfig;


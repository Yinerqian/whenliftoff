import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/launch-list.html",
        destination: "/launches",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

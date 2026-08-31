import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "seivtbhepctfxeiubnnv.supabase.co",
      }
    ],
  },
};

export default nextConfig;

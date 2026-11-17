import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.TICKET_ENGINE_E2E === "1" ? ".next-e2e" : ".next",
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

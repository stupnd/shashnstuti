import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos are private: every src is a time-limited signed URL from storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "quvhyvojejhtamkmzyoh.supabase.co",
        pathname: "/storage/v1/object/sign/photos/**",
      },
      {
        protocol: "https",
        hostname: "quvhyvojejhtamkmzyoh.supabase.co",
        pathname: "/storage/v1/object/sign/avatars/**",
      },
    ],
    // Tiles are small; the widest we ever render is a full-bleed phone photo.
    imageSizes: [96, 160, 256, 384],
    deviceSizes: [640, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;

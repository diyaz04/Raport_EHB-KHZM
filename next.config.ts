import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 300, // Simpan cache router di memory browser selama 5 menit
      static: 600,  // Simpan rute statis/prefetched selama 10 menit
    },
  },
};

export default nextConfig;


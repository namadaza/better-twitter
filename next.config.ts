import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images from external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
        pathname: '/**',
      },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Compress responses
  compress: true,
};

export default nextConfig;

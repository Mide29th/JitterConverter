import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'puppeteer',
    'fluent-ffmpeg',
    '@ffmpeg-installer/ffmpeg',
    '@ffprobe-installer/ffprobe',
    '@remotion/renderer',
    '@remotion/bundler'
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;

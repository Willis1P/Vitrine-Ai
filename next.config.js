/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['studio'],
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static'],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: '**.pollinations.ai' },
      { protocol: 'https', hostname: '**.muapi.ai' },
      { protocol: 'https', hostname: 'cdn.muapi.ai' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
    ],
  },
};

module.exports = nextConfig;

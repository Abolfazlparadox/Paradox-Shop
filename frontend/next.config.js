/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: 'backend',
      },
    ],
  },
  async rewrites() {
    const backendInternalUrl =
      process.env.INTERNAL_BACKEND_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      (process.env.INTERNAL_API_URL ? process.env.INTERNAL_API_URL.replace(/\/api\/v1\/?$/, '') : null) ||
      'http://backend:8000';

    return [
      {
        source: '/media/:path*',
        destination: `${backendInternalUrl}/media/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
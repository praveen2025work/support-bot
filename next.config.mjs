/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
  },
  async rewrites() {
    const engineUrl = process.env.ENGINE_URL || 'http://localhost:4001';
    // Proxy /api/* calls to the Engine service.
    // Use afterFiles so that local Next.js API routes (e.g. /api/admin/auth,
    // /api/admin/users, /api/userinfo) take precedence over the engine proxy.
    return {
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${engineUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;

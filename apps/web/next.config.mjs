/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tire-store/ui', '@tire-store/types', '@tire-store/api-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;


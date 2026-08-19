import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@atom/core'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: `${SERVER_URL}/api/auth/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${SERVER_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;


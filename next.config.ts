import type { NextConfig } from 'next';
import { securityHeaders } from './src/config/securityHeaders';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb'
    }
  },
  // Les réponses SSR sur Cloudflare ne reçoivent pas public/_headers : on les pose ici aussi.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.NODE_ENV !== 'production') }];
  }
};

export default nextConfig;
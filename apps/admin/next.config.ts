import type { NextConfig } from 'next';

// The admin reaches the API through its own origin, so the session cookie stays first-party and
// no CORS is needed. API_URL is where the API listens.
const apiUrl = process.env.API_URL ?? 'http://127.0.0.1:38491';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  agentRules: false,
  rewrites: () =>
    Promise.resolve([{ source: '/api/v1/:path*', destination: `${apiUrl}/api/v1/:path*` }]),
};

export default nextConfig;

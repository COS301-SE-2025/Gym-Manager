import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable HMR for CSS modules to prevent removeChild errors
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  // Experimental features to improve HMR stability
  experimental: {
    optimizePackageImports: ['react-big-calendar', 'moment'],
  },
};

export default nextConfig;

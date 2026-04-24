import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aura/core', '@aura/types', '@aura/ui'],
};

export default nextConfig;

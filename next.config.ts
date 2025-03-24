import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // 在客户端构建中忽略这些模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        bcrypt: false,
        '@mapbox/node-pre-gyp': false,
      };
    }
    return config;
  },
};

export default nextConfig;

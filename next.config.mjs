/** @type {import('next').NextConfig} */
const nextConfig = {
  // دعم المكتبات الخارجية
  serverExternalPackages: ['node-cron', 'playwright'],
  
  // إعدادات webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    return config
  },
};

export default nextConfig;
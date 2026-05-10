import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  // 启用 standalone 输出模式以优化 Docker 镜像大小
  output: 'standalone',
  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // 允许本地图片使用查询字符串
    localPatterns: [
      {
        pathname: '/api/image/**',
        search: '', // 允许所有查询参数
      },
    ],
  },
};

export default nextConfig;

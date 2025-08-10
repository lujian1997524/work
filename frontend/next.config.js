/** @type {import('next').NextConfig} */

const path = require('path')

const nextConfig = {
  // 标准的Next.js开发配置
  reactStrictMode: true,
  
  // Webpack配置
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '.'),
    }
    return config
  },
  
  // 静态资源配置
  images: {
    domains: ['localhost']
  },
  
  // 环境变量配置
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:35001'
  }
}

module.exports = nextConfig
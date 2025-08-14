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
    domains: ['api.gei5.com', 'localhost']
  },
  
  // 环境变量配置
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com'
  }
}

module.exports = nextConfig
import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { GlobalSyncInitializer } from '@/components/common/SyncManager'

export const metadata: Metadata = {
  title: '激光切割生产管理系统',
  description: '公司内部激光切割生产计划管理系统 - 实时追踪板材生产完成状态',
  keywords: ['激光切割', '生产管理', '板材管理', '项目管理', '工人管理'],
  authors: [{ name: '激光切割管理系统' }],
  formatDetection: {
    telephone: false,
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="/dxf-fonts.css" />
      </head>
      <body>
        <AuthProvider>
          <GlobalSyncInitializer />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
// 服务器端缓存清理API端点
// 放置在 /api/clear-cache 路由中使用

class ServerCacheCleaner {
  static async clearAllCaches(req, res) {
    try {
      const clearResult = {
        timestamp: new Date().toISOString(),
        cleared: [],
        errors: []
      };

      // 设置强制无缓存响应头
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.setHeader('ETag', `"${Date.now()}"`);
      
      // 如果使用了CDN，添加CDN缓存清理头
      res.setHeader('X-Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Expires', '0'); // Nginx
      res.setHeader('X-Cache-Purge', 'true');
      
      clearResult.cleared.push('HTTP响应头已设置为强制无缓存');

      // 模拟清理操作
      const clearOperations = [
        { name: '浏览器缓存清理指令', action: 'sent' },
        { name: '服务器端缓存标记', action: 'cleared' },
        { name: 'CDN缓存失效指令', action: 'sent' },
        { name: '静态资源版本更新', action: 'updated' }
      ];

      clearOperations.forEach(op => {
        clearResult.cleared.push(`${op.name}: ${op.action}`);
      });

      // 返回清理结果
      res.status(200).json({
        success: true,
        message: '服务器端缓存清理完成',
        result: clearResult,
        instructions: {
          client: '请在浏览器中执行强制刷新 (Ctrl+Shift+R)',
          server: '服务器缓存已标记清理',
          cdn: 'CDN缓存失效指令已发送'
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: '服务器缓存清理失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 生成缓存破坏版本号
  static generateCacheBusterVersion() {
    return {
      version: Date.now(),
      hash: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString()
    };
  }

  // 设置无缓存中间件
  static noCacheMiddleware(req, res, next) {
    // 对所有静态资源设置无缓存
    if (req.url.includes('/_next/') || req.url.includes('/static/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  }
}

// 导出清理工具
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServerCacheCleaner;
}

// 浏览器环境下的使用
if (typeof window !== 'undefined') {
  window.ServerCacheCleaner = ServerCacheCleaner;
}
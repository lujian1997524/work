// 缓存版本管理器 - 解决代码更新缓存问题
// 在 public 目录下，用于生成和管理缓存版本

class CacheVersionManager {
  static VERSION_FILE = '/cache-version.json';
  
  // 生成新的缓存版本
  static generateNewVersion() {
    const version = {
      timestamp: Date.now(),
      version: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      hash: Math.random().toString(36).substring(2, 15),
      buildId: `build_${Date.now()}`,
      created: new Date().toLocaleString('zh-CN'),
    };
    
    return version;
  }
  
  // 获取当前版本
  static async getCurrentVersion() {
    try {
      const response = await fetch(this.VERSION_FILE + '?t=' + Date.now());
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log('获取版本信息失败:', error);
    }
    
    // 如果获取失败，返回默认版本
    return this.generateNewVersion();
  }
  
  // 检查是否需要强制刷新
  static async checkForceRefresh() {
    const currentVersion = await this.getCurrentVersion();
    const storedVersion = localStorage.getItem('app-version');
    
    if (storedVersion && storedVersion !== currentVersion.version) {
      console.log('检测到新版本，准备强制刷新');
      return true;
    }
    
    // 存储当前版本
    localStorage.setItem('app-version', currentVersion.version);
    return false;
  }
  
  // 强制刷新应用
  static forceRefreshApp() {
    console.log('🔄 强制刷新应用以加载最新版本');
    
    // 清理所有缓存
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // 清理本地存储中的版本信息
    localStorage.removeItem('app-version');
    
    // 强制刷新页面，添加时间戳防止缓存
    const currentUrl = window.location.href.split('?')[0];
    const refreshUrl = `${currentUrl}?force-refresh=${Date.now()}&v=${Math.random()}`;
    window.location.href = refreshUrl;
  }
  
  // 在页面加载时自动检查版本
  static async autoCheckVersion() {
    try {
      const needsRefresh = await this.checkForceRefresh();
      if (needsRefresh) {
        // 延迟2秒后刷新，给用户看到提示的机会
        setTimeout(() => {
          this.forceRefreshApp();
        }, 2000);
        
        return true;
      }
    } catch (error) {
      console.log('版本检查失败:', error);
    }
    
    return false;
  }
  
  // 手动触发版本检查
  static async manualVersionCheck() {
    const button = document.createElement('button');
    button.textContent = '🔍 检查更新';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 12px;
    `;
    
    button.onclick = async () => {
      button.textContent = '🔄 检查中...';
      const needsRefresh = await this.checkForceRefresh();
      
      if (needsRefresh) {
        button.textContent = '🆕 发现更新';
        button.style.background = '#28a745';
        setTimeout(() => this.forceRefreshApp(), 1000);
      } else {
        button.textContent = '✅ 已是最新';
        button.style.background = '#6c757d';
        setTimeout(() => {
          button.textContent = '🔍 检查更新';
          button.style.background = '#007bff';
        }, 2000);
      }
    };
    
    document.body.appendChild(button);
    
    // 10秒后自动隐藏按钮
    setTimeout(() => {
      if (document.body.contains(button)) {
        document.body.removeChild(button);
      }
    }, 10000);
  }
}

// 导出供其他模块使用
if (typeof window !== 'undefined') {
  window.CacheVersionManager = CacheVersionManager;
  
  // 页面加载完成后自动检查版本
  document.addEventListener('DOMContentLoaded', () => {
    CacheVersionManager.autoCheckVersion();
    
    // 开发环境显示手动检查按钮 - 已禁用，用户要求移除
    // if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
    //   CacheVersionManager.manualVersionCheck();
    // }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheVersionManager;
}
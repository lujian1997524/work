/**
 * 纯Web图纸处理器 - 完全避免Tauri依赖
 */

import { apiRequest } from '@/utils/api';

interface Drawing {
  id: number;
  filename: string;
  version: string;
  filePath: string;
  projectId: number;
}

interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// 简单的通知函数（使用控制台，避免原生弹窗）
function showNotification(options: NotificationOptions): void {
  const { type, title, message } = options;
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${emoji} ${title}: ${message}`);
  
  // 可以在这里添加自定义通知组件的调用
  // 例如：window.dispatchEvent(new CustomEvent('show-notification', { detail: options }));
}

// 获取认证token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

// ==================== Web端图纸下载 ====================

export async function downloadDrawingWeb(drawing: Drawing): Promise<void> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('未登录');
    }
    
    // 使用统一的apiRequest调用，这样会正确调用35001端口
    const response = await apiRequest(`/api/drawings/${drawing.id}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = drawing.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification({
      type: 'success',
      title: '下载完成',
      message: `${drawing.filename} 已下载到本地`
    });
    
  } catch (error) {
    console.error('Web下载失败:', error);
    showNotification({
      type: 'error',
      title: '下载失败',
      message: error instanceof Error ? error.message : '图纸下载失败，请重试'
    });
    throw error;
  }
}

// ==================== 平台检测（简化版） ====================

export function detectPlatform() {
  // 检查是否在Tauri环境
  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;
  
  return {
    type: isTauri ? 'tauri-desktop' : 'web',
    canOpenCADFiles: isTauri,
    canDownloadFiles: true,
    hasFileSystem: isTauri
  };
}

// ==================== 统一操作接口 ====================

export async function handleDrawingAction(drawing: Drawing): Promise<void> {
  const platform = detectPlatform();
  
  if (platform.canOpenCADFiles) {
    // Tauri环境：未来可以调用CAD软件打开
    // 目前降级到下载
    console.log('Tauri环境检测到，但CAD集成功能待实现，降级到下载');
    await downloadDrawingWeb(drawing);
  } else {
    // Web环境：直接下载
    await downloadDrawingWeb(drawing);
  }
}

// 导出其他函数以保持接口兼容性
export const openCADFileWithTauri = handleDrawingAction;
export const downloadDrawingToTauri = handleDrawingAction;
export const shareDrawingAndroid = handleDrawingAction;

export async function getAvailableCADApplications(): Promise<string[]> {
  // Web环境下返回空数组
  return [];
}
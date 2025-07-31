/**
 * 纯Tauri平台检测器
 * 支持: Web浏览器、Tauri桌面端(macOS/Windows)、Android
 */

export type PlatformType = 'web' | 'tauri-desktop' | 'android';

export interface PlatformCapabilities {
  type: PlatformType;
  os?: 'macos' | 'windows' | 'linux';
  canOpenCADFiles: boolean;
  canDownloadFiles: boolean;
  hasFileSystem: boolean;
  cadApplications: string[];
  supportedFormats: string[];
}

export function detectPlatform(): PlatformCapabilities {
  // Tauri环境检测
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    // 检查操作系统
    const userAgent = navigator.userAgent.toLowerCase();
    let os: 'macos' | 'windows' | 'linux' = 'linux';
    
    if (userAgent.includes('mac')) {
      os = 'macos';
    } else if (userAgent.includes('win')) {
      os = 'windows';
    }
    
    return {
      type: 'tauri-desktop',
      os,
      canOpenCADFiles: true,
      canDownloadFiles: true,
      hasFileSystem: true,
      cadApplications: os === 'macos' 
        ? ['AutoCAD', 'Fusion 360', 'DraftSight', 'FreeCAD'] 
        : ['AutoCAD', 'SolidWorks', 'DraftSight', 'FreeCAD'],
      supportedFormats: ['dxf', 'dwg', 'step', 'iges', 'pdf']
    };
  }
  
  // Android环境检测（Tauri移动端）
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__?.metadata?.currentTarget?.includes('android')) {
    return {
      type: 'android',
      canOpenCADFiles: false,
      canDownloadFiles: true,
      hasFileSystem: true,
      cadApplications: [],
      supportedFormats: ['dxf', 'pdf']
    };
  }
  
  // 默认Web环境
  return {
    type: 'web',
    canOpenCADFiles: false,
    canDownloadFiles: true,
    hasFileSystem: false,
    cadApplications: [],
    supportedFormats: ['dxf', 'pdf']
  };
}

export function getPlatformConfig() {
  const platform = detectPlatform();
  
  return {
    platform,
    features: {
      // 桌面端功能
      canOpenCADDirectly: platform.type === 'tauri-desktop',
      canSaveToCustomLocation: platform.type === 'tauri-desktop',
      canManageFiles: platform.type === 'tauri-desktop',
      
      // 移动端功能
      canShare: platform.type === 'android',
      canOpenWithExternalApp: platform.type === 'android',
      
      // 通用功能
      canDownload: platform.canDownloadFiles,
      canPreview: true, // 所有平台都支持预览
    }
  };
}
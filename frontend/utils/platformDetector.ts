/**
 * Web平台检测器 - 简化版
 * 专用于Web浏览器环境
 */

export type PlatformType = 'web';

export interface PlatformCapabilities {
  type: PlatformType;
  canOpenCADFiles: boolean;
  canDownloadFiles: boolean;
  hasFileSystem: boolean;
  cadApplications: string[];
  supportedFormats: string[];
}

export function detectPlatform(): PlatformCapabilities {
  // Web环境
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
      // Web功能
      canOpenCADDirectly: false,
      canSaveToCustomLocation: false,
      canManageFiles: false,
      canShare: false,
      canOpenWithExternalApp: false,
      
      // 通用功能
      canDownload: platform.canDownloadFiles,
      canPreview: true,
    }
  };
}
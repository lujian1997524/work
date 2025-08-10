// Web环境CAD文件处理接口
// 纯Web环境下的CAD文件处理功能

class CADFileHandler {
  private supportedExtensions: string[];

  constructor() {
    this.supportedExtensions = ['.dxf', '.dwg', '.pdf', '.jpg', '.jpeg', '.png', '.svg'];
  }

  // Web环境下的CAD软件检测（返回不支持）
  async detectCADSoftware() {
    return {
      success: false,
      error: 'CAD软件检测仅在桌面应用中可用，Web环境下支持文件预览和下载'
    };
  }

  // Web环境下的文件处理（下载）
  async openCADFile(filePath: string) {
    try {
      const link = document.createElement('a');
      link.href = filePath;
      link.download = filePath.split('/').pop() || '图纸文件';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return {
        success: true,
        software: '浏览器下载',
        message: '文件已下载到本地'
      };
    } catch (error) {
      return {
        success: false,
        error: '文件下载失败'
      };
    }
  }

  // Web环境下的软件列表（空）
  async getDetectedSoftware() {
    return {
      success: false,
      error: 'CAD软件检测仅在桌面应用中可用'
    };
  }

  // Web环境下的CAD文件检查
  async isCADFile(filePath: string) {
    const fileExtension = this.getFileExtension(filePath);
    
    return {
      success: true,
      isCADFile: this.supportedExtensions.includes(fileExtension.toLowerCase()),
      extension: fileExtension,
      supportedExtensions: this.supportedExtensions
    };
  }

  // 获取文件扩展名
  getFileExtension(filePath: string) {
    const lastDotIndex = filePath.lastIndexOf('.');
    return lastDotIndex !== -1 ? filePath.substring(lastDotIndex) : '';
  }

  // 获取支持的扩展名列表
  getSupportedExtensions() {
    return this.supportedExtensions;
  }

  // Web环境下没有CAD软件信息
  getCADSoftwareInfo() {
    return [];
  }

  // Web环境检查
  isElectronEnvironment() {
    return false;
  }

  // Web环境下的软件信息格式化
  formatSoftwareInfo() {
    return 'Web环境：支持文件预览和下载';
  }

  // Web环境下的软件推荐
  recommendCADSoftware(fileExtension: string) {
    const ext = fileExtension.toLowerCase();
    
    if (ext === '.dxf') {
      return {
        name: 'DXF预览器',
        type: 'web-viewer',
        description: '在线DXF文件预览'
      };
    }
    
    return {
      name: '文件下载',
      type: 'download',
      description: '下载文件到本地使用相应软件打开'
    };
  }
}

// 创建全局实例
const cadFileHandler = new CADFileHandler();

// 导出供React组件使用
export default cadFileHandler;
export { cadFileHandler };
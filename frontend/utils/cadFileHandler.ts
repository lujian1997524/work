// 前端CAD文件处理接口
// 为渲染进程提供CAD文件检测和打开功能

class CADFileHandler {
  private isElectron: boolean;
  private detectedSoftware: any[];
  private supportedExtensions: string[];

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI != undefined;
    this.detectedSoftware = [];
    this.supportedExtensions = [];
  }

  // 检测CAD软件
  async detectCADSoftware() {
    if (!this.isElectron) {
      console.warn('CAD软件检测仅在Electron环境下可用');
      return {
        success: false,
        error: 'CAD软件检测仅在桌面应用中可用'
      };
    }

    try {
      const result = await window.electronAPI!.invoke('detect-cad-software');
      if (result.success) {
        this.detectedSoftware = result.software;
        this.supportedExtensions = result.supportedExtensions;
      }
      return result;
    } catch (error) {
      console.error('检测CAD软件失败:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // 打开CAD文件
  async openCADFile(filePath: string) {
    if (!this.isElectron) {
      // 在浏览器环境下，尝试下载文件
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

    try {
      const result = await window.electronAPI!.invoke('open-cad-file', filePath);
      return result;
    } catch (error) {
      console.error('打开CAD文件失败:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // 获取已检测的软件列表
  async getDetectedSoftware() {
    if (!this.isElectron) {
      return {
        success: false,
        error: 'CAD软件检测仅在桌面应用中可用'
      };
    }

    try {
      const result = await window.electronAPI!.invoke('get-detected-cad-software');
      if (result.success) {
        this.detectedSoftware = result.software;
        this.supportedExtensions = result.supportedExtensions;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // 检查文件是否为CAD文件
  async isCADFile(filePath: string) {
    if (!this.isElectron) {
      // 在浏览器环境下，仅支持DXF格式
      const cadExtensions = ['.dxf'];
      const fileExtension = this.getFileExtension(filePath);
      
      return {
        success: true,
        isCADFile: cadExtensions.includes(fileExtension.toLowerCase()),
        extension: fileExtension,
        supportedExtensions: cadExtensions
      };
    }

    try {
      const result = await window.electronAPI!.invoke('is-cad-file', filePath);
      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
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

  // 获取CAD软件信息
  getCADSoftwareInfo() {
    return this.detectedSoftware;
  }

  // 检查是否在Electron环境
  isElectronEnvironment() {
    return this.isElectron;
  }

  // 格式化软件信息用于显示
  formatSoftwareInfo() {
    if (!this.detectedSoftware.length) {
      return '未检测到CAD软件';
    }

    const softwareNames = this.detectedSoftware.map((software: any) => software.name);
    return `检测到 ${softwareNames.length} 个CAD软件: ${softwareNames.join(', ')}`;
  }

  // 根据文件类型推荐CAD软件
  recommendCADSoftware(fileExtension: string) {
    const ext = fileExtension.toLowerCase();
    const compatibleSoftware = this.detectedSoftware.filter((software: any) => 
      software.extensions && software.extensions.includes(ext)
    );

    if (compatibleSoftware.length === 0) {
      return null;
    }

    // 优先推荐AutoCAD和CAXA
    const priority = ['autocad', 'caxa', 'solidworks', 'fusion360'];
    compatibleSoftware.sort((a: any, b: any) => {
      const aIndex = priority.indexOf(a.type);
      const bIndex = priority.indexOf(b.type);
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });

    return compatibleSoftware[0];
  }
}

// 创建全局实例
const cadFileHandler = new CADFileHandler();

// 导出供React组件使用
export default cadFileHandler;
export { cadFileHandler };
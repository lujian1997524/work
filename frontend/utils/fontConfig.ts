/**
 * 简化的字体配置 - 仅使用WebCache.cn CDN
 * frontend/utils/fontConfig.ts
 */

export interface FontConfig {
  name: string;
  url: string;
  size: string;
  priority: number;
  description: string;
}

/**
 * WebCache.cn 字体CDN配置（仅此一种方式）
 */
export const webCacheFonts: FontConfig[] = [
  {
    name: 'Roboto',
    url: 'https://font.webcache.cn/google/css2?family=Roboto:wght@300;400;500&display=swap',
    size: '~150KB',
    priority: 1,
    description: '基础西文字体，快速加载'
  },
  {
    name: 'Noto Sans SC',
    url: 'https://font.webcache.cn/google/css2?family=Noto+Sans+SC:wght@300;400;500&display=swap',
    size: '~4MB',
    priority: 2,
    description: '优化的简体中文字体'
  },
  {
    name: 'Roboto Mono',
    url: 'https://font.webcache.cn/google/css2?family=Roboto+Mono:wght@300;400;500&display=swap',
    size: '~200KB',
    priority: 3,
    description: '等宽字体，适合工程图纸'
  },
  {
    name: 'Source Sans Pro',
    url: 'https://font.webcache.cn/google/css2?family=Source+Sans+Pro:wght@300;400;600&display=swap',
    size: '~180KB',
    priority: 4,
    description: '清晰的无衬线字体'
  },
  {
    name: 'Open Sans',
    url: 'https://font.webcache.cn/google/css2?family=Open+Sans:wght@300;400;600&display=swap',
    size: '~160KB',
    priority: 5,
    description: '开放的无衬线字体'
  }
];

/**
 * 简化的DXF字体管理器 - 只使用WebCache.cn
 */
export class DxfFontManager {
  private static instance: DxfFontManager;
  private loadedFonts = new Set<string>();
  private fontLoadPromises = new Map<string, Promise<void>>();

  private constructor() {}

  public static getInstance(): DxfFontManager {
    if (!DxfFontManager.instance) {
      DxfFontManager.instance = new DxfFontManager();
    }
    return DxfFontManager.instance;
  }

  /**
   * 获取优化字体配置 - 仅WebCache.cn
   */
  public getOptimizedFonts(): string[] {
    return webCacheFonts.map(font => font.url);
  }

  /**
   * 预加载关键字体
   */
  public async preloadCriticalFonts(): Promise<void> {
    const criticalFonts = webCacheFonts.map(font => font.url);
    const loadPromises = criticalFonts.map(url => this.loadFont(url));
    await Promise.allSettled(loadPromises);
  }

  /**
   * 加载单个字体
   */
  private async loadFont(url: string): Promise<void> {
    if (this.loadedFonts.has(url)) {
      return;
    }

    if (this.fontLoadPromises.has(url)) {
      return this.fontLoadPromises.get(url)!;
    }

    const loadPromise = this.performFontLoad(url);
    this.fontLoadPromises.set(url, loadPromise);

    try {
      await loadPromise;
      this.loadedFonts.add(url);
    } catch (error) {
      console.warn(`WebCache.cn字体加载失败: ${url}`, error);
      this.fontLoadPromises.delete(url);
    }
  }

  /**
   * 执行字体加载
   */
  private async performFontLoad(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = url;
      link.crossOrigin = 'anonymous';
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`无法加载WebCache.cn字体: ${url}`));
      
      document.head.appendChild(link);
    });
  }

  /**
   * 获取字体加载统计
   */
  public getFontStats(): { loaded: number; total: number; loadedFonts: string[] } {
    return {
      loaded: this.loadedFonts.size,
      total: webCacheFonts.length,
      loadedFonts: Array.from(this.loadedFonts)
    };
  }

  /**
   * 为DXF查看器生成字体配置
   */
  public generateDxfViewerConfig(): {
    fonts: string[];
    progressCallback?: (phase: string, loaded: number, total: number) => void;
  } {
    return {
      fonts: this.getOptimizedFonts(),
      progressCallback: (phase: string, loaded: number, total: number) => {
        if (phase === 'font') {
          console.log(`WebCache.cn字体加载进度: ${loaded}/${total} (${Math.round(loaded/total*100)}%)`);
        }
      }
    };
  }
}

/**
 * 字体性能监控（简化版）
 */
export class FontPerformanceMonitor {
  /**
   * 检测WebCache.cn字体加载速度
   */
  public static async testWebCacheFontSpeed(): Promise<number> {
    const fontManager = DxfFontManager.getInstance();
    
    const startTime = performance.now();
    
    try {
      await fontManager.preloadCriticalFonts();
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      console.log(`WebCache.cn字体加载完成，用时: ${loadTime}ms`);
      return loadTime;
    } catch (error) {
      console.error('WebCache.cn字体加载失败:', error);
      return -1;
    }
  }
}
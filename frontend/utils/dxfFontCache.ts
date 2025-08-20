/**
 * DXF 字体缓存管理器 - 优化字体加载性能
 * frontend/utils/dxfFontCache.ts
 */

class DxfFontCache {
  private static instance: DxfFontCache;
  private fontCache = new Map<string, ArrayBuffer>();
  private fontUrlCache = new Map<string, string>(); // 缓存Blob URL
  private loadingPromises = new Map<string, Promise<ArrayBuffer>>();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DxfFontCache {
    if (!DxfFontCache.instance) {
      DxfFontCache.instance = new DxfFontCache();
    }
    return DxfFontCache.instance;
  }

  /**
   * 预加载字体 - 应用启动时调用
   */
  public async preloadFonts(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🎨 开始预加载 DXF 字体...');
    const startTime = performance.now();

    try {
      // 预加载思源黑体
      await this.loadFont('/fonts/NotoSansSC-Thin.ttf');
      
      this.isInitialized = true;
      const loadTime = performance.now() - startTime;
      console.log(`✅ DXF 字体预加载完成，用时: ${Math.round(loadTime)}ms`);
    } catch (error) {
      console.error('❌ DXF 字体预加载失败:', error);
    }
  }

  /**
   * 加载单个字体文件
   */
  private async loadFont(fontPath: string): Promise<ArrayBuffer> {
    // 如果已经缓存，直接返回
    if (this.fontCache.has(fontPath)) {
      console.log(`📦 使用缓存字体: ${fontPath}`);
      return this.fontCache.get(fontPath)!;
    }

    // 如果正在加载，返回加载Promise
    if (this.loadingPromises.has(fontPath)) {
      return this.loadingPromises.get(fontPath)!;
    }

    // 开始加载字体
    const loadingPromise = this.fetchFont(fontPath);
    this.loadingPromises.set(fontPath, loadingPromise);

    try {
      const fontBuffer = await loadingPromise;
      this.fontCache.set(fontPath, fontBuffer);
      
      // 创建Blob URL用于DXF查看器
      const blob = new Blob([fontBuffer], { type: 'font/ttf' });
      const blobUrl = URL.createObjectURL(blob);
      this.fontUrlCache.set(fontPath, blobUrl);
      
      this.loadingPromises.delete(fontPath);
      console.log(`✅ 字体加载完成: ${fontPath} -> ${blobUrl}`);
      return fontBuffer;
    } catch (error) {
      this.loadingPromises.delete(fontPath);
      console.error(`❌ 字体加载失败: ${fontPath}`, error);
      throw error;
    }
  }

  /**
   * 获取字体文件
   */
  private async fetchFont(fontPath: string): Promise<ArrayBuffer> {
    const response = await fetch(fontPath);
    if (!response.ok) {
      throw new Error(`字体文件加载失败: ${response.status}`);
    }
    return await response.arrayBuffer();
  }

  /**
   * 获取缓存的字体URLs - DXF查看器使用
   */
  public getFontUrls(): string[] {
    if (!this.isInitialized) {
      console.warn('⚠️ 字体未预加载，可能影响显示效果');
      return ['/fonts/NotoSansSC-Thin.ttf']; // 降级到原始URL
    }
    
    // 返回缓存的Blob URL
    const cachedUrl = this.fontUrlCache.get('/fonts/NotoSansSC-Thin.ttf');
    if (cachedUrl) {
      console.log(`🎯 使用缓存的字体URL: ${cachedUrl}`);
      return [cachedUrl];
    }
    
    // 如果没有缓存，降级到原始URL
    console.warn('⚠️ 字体缓存的Blob URL不存在，使用原始URL');
    return ['/fonts/NotoSansSC-Thin.ttf'];
  }

  /**
   * 检查字体是否已缓存
   */
  public isFontCached(fontPath: string): boolean {
    return this.fontCache.has(fontPath);
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): {
    totalFonts: number;
    cachedFonts: number;
    cacheSize: string;
    isInitialized: boolean;
  } {
    let totalSize = 0;
    this.fontCache.forEach(buffer => {
      totalSize += buffer.byteLength;
    });

    return {
      totalFonts: 1, // 只有一个字体文件
      cachedFonts: this.fontCache.size,
      cacheSize: `${(totalSize / (1024 * 1024)).toFixed(1)} MB`,
      isInitialized: this.isInitialized
    };
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    // 清理Blob URLs，避免内存泄漏
    this.fontUrlCache.forEach(url => {
      URL.revokeObjectURL(url);
    });
    
    this.fontCache.clear();
    this.fontUrlCache.clear();
    this.loadingPromises.clear();
    this.isInitialized = false;
    console.log('🗑️ DXF 字体缓存已清理');
  }
}

export default DxfFontCache;
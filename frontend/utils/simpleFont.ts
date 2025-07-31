// 简单的字体数据生成器
export function generateSimpleFont() {
  // 创建一个简单的字体数据对象
  // 这不是真正的字体文件，而是为dxf-viewer提供的简单映射
  return {
    name: 'SimpleFont',
    data: new ArrayBuffer(1024), // 简单的空字体数据
    glyphs: {
      // 基本字符映射
      'A': { width: 10, height: 12 },
      'B': { width: 10, height: 12 },
      'C': { width: 10, height: 12 },
      // ... 更多字符
    }
  };
}
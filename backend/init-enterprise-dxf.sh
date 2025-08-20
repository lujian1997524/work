#!/bin/bash

# 企业级DXF预览系统初始化脚本

echo "🚀 初始化企业级DXF预览系统..."

# 创建后端缓存目录结构
echo "📁 创建缓存目录结构..."

# 创建DXF缓存目录
mkdir -p cache/dxf
echo "✅ 创建 cache/dxf 目录"

# 创建图像缓存目录  
mkdir -p cache/images
echo "✅ 创建 cache/images 目录"

# 创建临时文件目录
mkdir -p cache/temp
echo "✅ 创建 cache/temp 目录"

# 创建上传文件目录（如果不存在）
mkdir -p uploads/drawings
echo "✅ 确保 uploads/drawings 目录存在"

# 设置目录权限
chmod -R 755 cache/
chmod -R 755 uploads/
echo "✅ 设置目录权限"

# 创建.gitkeep文件保持目录结构
touch cache/dxf/.gitkeep
touch cache/images/.gitkeep  
touch cache/temp/.gitkeep
echo "✅ 创建.gitkeep文件"

echo ""
echo "🎯 企业级DXF预览系统初始化完成！"
echo ""
echo "📂 目录结构："
echo "├── cache/"
echo "│   ├── dxf/          # DXF解析结果缓存"
echo "│   ├── images/       # 预览图片缓存"
echo "│   └── temp/         # 临时文件"
echo "└── uploads/"
echo "    └── drawings/     # DXF文件存储"
echo ""
echo "🔧 支持功能："
echo "- ✨ WebAssembly高性能DXF解析"
echo "- 🎨 多分辨率预览图生成"
echo "- 💾 智能缓存管理（内存+文件）"
echo "- 📊 实体数据分页查询"
echo "- 🏭 企业级性能监控"
echo "- 🔍 精确边界框计算"
echo "- 📐 图层和元数据提取"
echo ""
echo "🌐 API端点："
echo "- GET  /api/enterprise-dxf/:id/enterprise-info     # 获取DXF详细信息"
echo "- GET  /api/enterprise-dxf/:id/entities            # 获取实体数据（分页）"
echo "- GET  /api/enterprise-dxf/:id/preview/:resolution # 生成多分辨率预览图"
echo "- GET  /api/enterprise-dxf/:id/performance         # 性能监控"
echo "- DEL  /api/enterprise-dxf/cache                   # 清理缓存（管理员）"
echo "- GET  /api/enterprise-dxf/health                  # 健康检查"
echo ""
echo "✅ 可以开始使用企业级DXF预览功能了！"
// 全新DXF预览API - 简洁高效
// backend/src/routes/dxf-preview.js

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { Drawing } = require('../models');
const { authenticate } = require('../middleware/auth');

// 获取DXF文件原始内容（用于前端解析）
router.get('/:drawingId/content', authenticate, async (req, res) => {
  try {
    const { drawingId } = req.params;
    
    const drawing = await Drawing.findByPk(drawingId);
    if (!drawing) {
      return res.status(404).json({
        success: false,
        error: '图纸不存在'
      });
    }
    
    // 检查文件是否存在
    try {
      await fs.access(drawing.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: '文件不存在或已被删除'
      });
    }
    
    // 只支持DXF文件
    const fileName = drawing.originalFilename || drawing.filename;
    if (!fileName.toLowerCase().endsWith('.dxf')) {
      return res.status(400).json({
        success: false,
        error: '只支持DXF文件预览'
      });
    }
    
    // 读取DXF文件内容
    const fileContent = await fs.readFile(drawing.filePath, 'utf8');
    
    // 返回文件信息和内容
    res.json({
      success: true,
      drawing: {
        id: drawing.id,
        filename: fileName,
        originalName: drawing.originalFilename,
        version: drawing.version?.toString() || '1',
        uploadTime: drawing.uploadTime,
        fileSize: drawing.fileSize
      },
      content: fileContent,
      contentLength: fileContent.length
    });
    
  } catch (error) {
    console.error('获取DXF内容失败:', error);
    res.status(500).json({
      success: false,
      error: '获取DXF内容失败',
      details: error.message
    });
  }
});

// 获取图纸基本信息（不包含内容，用于列表显示）
router.get('/:drawingId/info', authenticate, async (req, res) => {
  try {
    const { drawingId } = req.params;
    
    const drawing = await Drawing.findByPk(drawingId);
    if (!drawing) {
      return res.status(404).json({
        success: false,
        error: '图纸不存在'
      });
    }
    
    res.json({
      success: true,
      drawing: {
        id: drawing.id,
        filename: drawing.originalFilename || drawing.filename,
        originalName: drawing.originalFilename,
        version: drawing.version?.toString() || '1',
        uploadTime: drawing.uploadTime,
        fileSize: drawing.fileSize,
        status: drawing.status,
        description: drawing.description,
        canPreview: (drawing.originalFilename || drawing.filename).toLowerCase().endsWith('.dxf')
      }
    });
    
  } catch (error) {
    console.error('获取图纸信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取图纸信息失败',
      details: error.message
    });
  }
});

module.exports = router;
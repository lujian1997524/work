const express = require('express');
const router = express.Router();
const multer = require('multer');
const DxfParser = require('dxf-parser');
const { createCanvas } = require('canvas');

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.dxf')) {
      cb(null, true);
    } else {
      cb(new Error('只支持DXF格式文件'), false);
    }
  }
});

// DXF转图片接口
router.post('/convert-to-image', upload.single('dxf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传DXF文件' });
    }

    console.log('开始处理DXF文件:', req.file.originalname);

    // 解析DXF内容
    const dxfContent = req.file.buffer.toString('utf8');
    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfContent);

    console.log('DXF解析完成，实体数量:', dxf.entities?.length || 0);

    if (!dxf.entities || dxf.entities.length === 0) {
      return res.status(400).json({ error: 'DXF文件中没有可显示的图形实体' });
    }

    // 计算边界框
    const bounds = calculateBounds(dxf.entities);
    console.log('边界框:', bounds);

    // 创建Canvas并渲染
    const canvasWidth = 800;
    const canvasHeight = 600;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 设置白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 计算缩放和偏移
    const padding = 40;
    const availableWidth = canvasWidth - 2 * padding;
    const availableHeight = canvasHeight - 2 * padding;
    
    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;
    const offsetX = (canvasWidth - scaledWidth) / 2 - bounds.minX * scale;
    const offsetY = (canvasHeight - scaledHeight) / 2 + bounds.maxY * scale; // Y轴翻转

    // 设置绘制样式
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 渲染所有实体
    dxf.entities.forEach(entity => {
      renderEntityToCanvas(ctx, entity, scale, offsetX, offsetY, canvasHeight);
    });

    // 生成图片
    const buffer = canvas.toBuffer('image/png');
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);

    console.log('DXF转图片完成');

  } catch (error) {
    console.error('DXF转图片失败:', error);
    res.status(500).json({ 
      error: 'DXF转图片失败', 
      details: error.message 
    });
  }
});

// 计算边界框
function calculateBounds(entities) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let validEntities = 0;

  entities.forEach(entity => {
    switch (entity.type) {
      case 'LINE':
        if (entity.start && entity.end && 
            typeof entity.start.x === 'number' && typeof entity.start.y === 'number' &&
            typeof entity.end.x === 'number' && typeof entity.end.y === 'number') {
          minX = Math.min(minX, entity.start.x, entity.end.x);
          minY = Math.min(minY, entity.start.y, entity.end.y);
          maxX = Math.max(maxX, entity.start.x, entity.end.x);
          maxY = Math.max(maxY, entity.start.y, entity.end.y);
          validEntities++;
        }
        break;
      case 'CIRCLE':
        if (entity.center && typeof entity.radius === 'number' &&
            typeof entity.center.x === 'number' && typeof entity.center.y === 'number') {
          minX = Math.min(minX, entity.center.x - entity.radius);
          minY = Math.min(minY, entity.center.y - entity.radius);
          maxX = Math.max(maxX, entity.center.x + entity.radius);
          maxY = Math.max(maxY, entity.center.y + entity.radius);
          validEntities++;
        }
        break;
      case 'ARC':
        if (entity.center && typeof entity.radius === 'number' &&
            typeof entity.center.x === 'number' && typeof entity.center.y === 'number') {
          minX = Math.min(minX, entity.center.x - entity.radius);
          minY = Math.min(minY, entity.center.y - entity.radius);
          maxX = Math.max(maxX, entity.center.x + entity.radius);
          maxY = Math.max(maxY, entity.center.y + entity.radius);
          validEntities++;
        }
        break;
      case 'POLYLINE':
      case 'LWPOLYLINE':
        if (entity.vertices && Array.isArray(entity.vertices)) {
          entity.vertices.forEach(vertex => {
            if (vertex.x !== undefined && vertex.y !== undefined) {
              minX = Math.min(minX, vertex.x);
              minY = Math.min(minY, vertex.y);
              maxX = Math.max(maxX, vertex.x);
              maxY = Math.max(maxY, vertex.y);
              validEntities++;
            }
          });
        }
        break;
    }
  });

  if (minX === Infinity || validEntities === 0) {
    minX = minY = -100;
    maxX = maxY = 100;
  }

  // 确保边界框有最小尺寸
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 1) {
    const center = (minX + maxX) / 2;
    minX = center - 0.5;
    maxX = center + 0.5;
  }
  if (height < 1) {
    const center = (minY + maxY) / 2;
    minY = center - 0.5;
    maxY = center + 0.5;
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// 渲染实体到Canvas
function renderEntityToCanvas(ctx, entity, scale, offsetX, offsetY, canvasHeight) {
  try {
    ctx.beginPath();
    
    switch (entity.type) {
      case 'LINE':
        if (entity.start && entity.end && 
            typeof entity.start.x === 'number' && typeof entity.start.y === 'number' &&
            typeof entity.end.x === 'number' && typeof entity.end.y === 'number') {
          const x1 = entity.start.x * scale + offsetX;
          const y1 = canvasHeight - (entity.start.y * scale + offsetY);
          const x2 = entity.end.x * scale + offsetX;
          const y2 = canvasHeight - (entity.end.y * scale + offsetY);
          
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        break;
        
      case 'CIRCLE':
        if (entity.center && typeof entity.radius === 'number' &&
            typeof entity.center.x === 'number' && typeof entity.center.y === 'number') {
          const cx = entity.center.x * scale + offsetX;
          const cy = canvasHeight - (entity.center.y * scale + offsetY);
          const r = entity.radius * scale;
          
          ctx.arc(cx, cy, r, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
        
      case 'ARC':
        if (entity.center && typeof entity.radius === 'number' &&
            typeof entity.center.x === 'number' && typeof entity.center.y === 'number') {
          const cx = entity.center.x * scale + offsetX;
          const cy = canvasHeight - (entity.center.y * scale + offsetY);
          const r = entity.radius * scale;
          let startAngle = entity.startAngle || 0;
          let endAngle = entity.endAngle || Math.PI * 2;
          
          startAngle = -startAngle;
          endAngle = -endAngle;
          
          if (startAngle > endAngle) {
            [startAngle, endAngle] = [endAngle, startAngle];
          }
          
          ctx.arc(cx, cy, r, startAngle, endAngle);
          ctx.stroke();
        }
        break;
        
      case 'POLYLINE':
      case 'LWPOLYLINE':
        if (entity.vertices && Array.isArray(entity.vertices) && entity.vertices.length > 1) {
          let firstPoint = true;
          
          for (let i = 0; i < entity.vertices.length; i++) {
            const vertex = entity.vertices[i];
            if (vertex.x !== undefined && vertex.y !== undefined) {
              const x = vertex.x * scale + offsetX;
              const y = canvasHeight - (vertex.y * scale + offsetY);
              
              if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
              } else {
                ctx.lineTo(x, y);
              }
            }
          }
          
          if (entity.closed || (entity.flags && (entity.flags & 1))) {
            ctx.closePath();
          }
          
          ctx.stroke();
        }
        break;
    }
  } catch (error) {
    console.error('渲染实体失败:', error, entity);
  }
}

module.exports = router;
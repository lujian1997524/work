const { Op } = require('sequelize');

/**
 * 全局搜索API
 * 支持搜索项目、工人、图纸、厚度规格等多种内容类型
 */
const globalSearch = async (req, res) => {
  try {
    const { q: query, type = 'all', limit = 20 } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        results: [],
        total: 0,
        message: '搜索关键词至少需要2个字符'
      });
    }

    const searchQuery = query.trim();
    const results = [];

    // 根据搜索类型执行不同的搜索
    if (type === 'all' || type === 'projects') {
      const projects = await searchProjects(searchQuery, limit);
      results.push(...projects);
    }

    if (type === 'all' || type === 'workers') {
      const workers = await searchWorkers(searchQuery, limit);
      results.push(...workers);
    }

    if (type === 'all' || type === 'drawings') {
      const drawings = await searchDrawings(searchQuery, limit);
      results.push(...drawings);
    }

    if (type === 'all' || type === 'thickness_specs') {
      const thicknessSpecs = await searchThicknessSpecs(searchQuery, limit);
      results.push(...thicknessSpecs);
    }

    // 按相关度排序（简单实现：匹配度）
    const sortedResults = results.sort((a, b) => {
      const aScore = calculateRelevanceScore(a, searchQuery);
      const bScore = calculateRelevanceScore(b, searchQuery);
      return bScore - aScore;
    });

    // 限制结果数量
    const limitedResults = sortedResults.slice(0, parseInt(limit));

    res.json({
      success: true,
      results: limitedResults,
      total: sortedResults.length,
      query: searchQuery,
      type
    });

  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message
    });
  }
};

/**
 * 搜索项目
 */
const searchProjects = async (query, limit) => {
  const { Project, Worker } = require('../models');
  
  const projects = await Project.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } },
        { priority: { [Op.like]: `%${query}%` } },
        { status: { [Op.like]: `%${query}%` } }
      ]
    },
    include: [
      {
        model: Worker,
        as: 'assignedWorker',
        attributes: ['id', 'name']
      }
    ],
    limit: Math.ceil(limit / 4), // 为其他类型留出空间
    order: [['updatedAt', 'DESC']]
  });

  return projects.map(project => ({
    id: project.id,
    type: 'projects',
    title: project.name,
    subtitle: `优先级: ${project.priority} | 状态: ${getStatusLabel(project.status)}`,
    description: project.description || `负责人: ${project.assignedWorker?.name || '未分配'}`,
    data: project.toJSON()
  }));
};

/**
 * 搜索工人
 */
const searchWorkers = async (query, limit) => {
  const { Worker } = require('../models');
  
  const workers = await Worker.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { phone: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { department: { [Op.like]: `%${query}%` } },
        { position: { [Op.like]: `%${query}%` } }
      ]
    },
    limit: Math.ceil(limit / 4),
    order: [['updatedAt', 'DESC']]
  });

  return workers.map(worker => ({
    id: worker.id,
    type: 'workers',
    title: worker.name,
    subtitle: `${worker.department || '未知部门'} | ${worker.position || '未知职位'}`,
    description: `电话: ${worker.phone || '未填写'} | 邮箱: ${worker.email || '未填写'}`,
    data: worker.toJSON()
  }));
};

/**
 * 搜索图纸
 */
const searchDrawings = async (query, limit) => {
  const { Drawing, Project, User } = require('../models');
  
  const drawings = await Drawing.findAll({
    where: {
      [Op.or]: [
        { filename: { [Op.like]: `%${query}%` } },
        { originalFilename: { [Op.like]: `%${query}%` } },
        { version: { [Op.like]: `%${query}%` } }
      ]
    },
    include: [
      {
        model: Project,
        attributes: ['id', 'name']
      },
      {
        model: User,
        as: 'uploader',
        attributes: ['id', 'name']
      }
    ],
    limit: Math.ceil(limit / 4),
    order: [['uploadedAt', 'DESC']]
  });

  return drawings.map(drawing => ({
    id: drawing.id,
    type: 'drawings',
    title: drawing.originalFilename || drawing.filename,
    subtitle: `版本 ${drawing.version} | 项目: ${drawing.Project?.name || '未知'}`,
    description: `上传者: ${drawing.uploader?.name || '未知'} | ${new Date(drawing.uploadedAt).toLocaleDateString('zh-CN')}`,
    data: drawing.toJSON()
  }));
};

/**
 * 搜索厚度规格
 */
const searchThicknessSpecs = async (query, limit) => {
  const { ThicknessSpec } = require('../models');
  
  const specs = await ThicknessSpec.findAll({
    where: {
      [Op.or]: [
        { thickness: { [Op.like]: `%${query}%` } },
        { unit: { [Op.like]: `%${query}%` } },
        { materialType: { [Op.like]: `%${query}%` } }
      ],
      isActive: true
    },
    limit: Math.ceil(limit / 4),
    order: [['sortOrder', 'ASC']]
  });

  return specs.map(spec => ({
    id: spec.id,
    type: 'thickness_specs',
    title: `${spec.thickness}${spec.unit}`,
    subtitle: `材料类型: ${spec.materialType || '未指定'}`,
    description: spec.isActive ? '启用中' : '已禁用',
    data: spec.toJSON()
  }));
};

/**
 * 计算搜索相关度分数
 */
const calculateRelevanceScore = (result, query) => {
  const lowerQuery = query.toLowerCase();
  const title = (result.title || '').toLowerCase();
  const subtitle = (result.subtitle || '').toLowerCase();
  const description = (result.description || '').toLowerCase();

  let score = 0;

  // 标题完全匹配得分最高
  if (title === lowerQuery) score += 100;
  else if (title.includes(lowerQuery)) score += 50;
  else if (title.startsWith(lowerQuery)) score += 30;

  // 副标题匹配
  if (subtitle.includes(lowerQuery)) score += 20;

  // 描述匹配
  if (description.includes(lowerQuery)) score += 10;

  return score;
};

/**
 * 获取状态标签
 */
const getStatusLabel = (status) => {
  const statusMap = {
    'active': '活跃',
    'pending': '待处理',
    'in_progress': '进行中',
    'completed': '已完成',
    'paused': '暂停',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
};

module.exports = {
  globalSearch
};
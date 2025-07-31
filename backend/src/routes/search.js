const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth');
const { Project, Worker, Drawing, User, ThicknessSpec } = require('../models');

/**
 * 全局搜索 - 支持统一格式
 * GET /api/search?q=关键词&type=搜索类型&limit=结果数量
 */

// 判断是否为时间相关搜索
const isTimeRelatedSearch = (searchTerm) => {
  const timeKeywords = ['最近', '今天', '昨天', '本周', '上周', '本月', '上月', '时间', '日期'];
  const datePattern = /\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}/;
  
  return timeKeywords.some(keyword => searchTerm.includes(keyword)) || 
         datePattern.test(searchTerm);
};

router.get('/', authenticate, async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        projects: [],
        workers: [],
        departments: [],
        drawings: []
      });
    }

    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;
    
    // 导入模型
    const { Project, Worker, Department, Drawing, User } = require('../models');

    // 并行搜索所有类型
    const [projects, workers, departments, drawings] = await Promise.all([
      // 搜索项目
      Project.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: searchPattern } },
            { description: { [Op.like]: searchPattern } }
          ]
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: Worker,
            as: 'assignedWorker',
            attributes: ['id', 'name', 'department']
          }
        ],
        limit: 10,
        order: [['updatedAt', 'DESC']]
      }),

      // 搜索工人
      Worker.findAll({
        where: {
          [Op.and]: [
            { status: 'active' },
            {
              [Op.or]: [
                { name: { [Op.like]: searchPattern } },
                { department: { [Op.like]: searchPattern } },
                { position: { [Op.like]: searchPattern } },
                { phone: { [Op.like]: searchPattern } },
                { email: { [Op.like]: searchPattern } }
              ]
            }
          ]
        },
        include: [
          {
            model: Department,
            as: 'departmentInfo',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        limit: 10,
        order: [['name', 'ASC']]
      }),

      // 搜索部门
      Department.findAll({
        where: {
          [Op.and]: [
            { isActive: true },
            { name: { [Op.like]: searchPattern } }
          ]
        },
        limit: 8,
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      }),

      // 搜索图纸
      Drawing.findAll({
        where: {
          [Op.or]: [
            { filename: { [Op.like]: searchPattern } },
            { originalFilename: { [Op.like]: searchPattern } }
          ]
        },
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'name']
          }
        ],
        limit: 8,
        order: [['uploadTime', 'DESC']]
      })
    ]);

    // 格式化搜索结果
    const formatProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      assignedWorker: project.assignedWorker?.name || null,
      department: project.assignedWorker?.department || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }));

    const formatWorkers = workers.map(worker => ({
      id: worker.id,
      name: worker.name,
      department: worker.departmentInfo?.name || worker.department || '未分配',
      position: worker.position,
      phone: worker.phone,
      email: worker.email,
      status: worker.status
    }));

    const formatDepartments = await Promise.all(
      departments.map(async (dept) => {
        // 计算部门下的工人数量
        const workerCount = await Worker.count({
          where: { 
            [Op.or]: [
              { departmentId: dept.id },
              { department: dept.name }
            ],
            status: 'active'
          }
        });
        
        return {
          id: dept.id,
          name: dept.name,
          description: dept.description,
          meta: `${workerCount}`
        };
      })
    );

    const formatDrawings = drawings.map(drawing => ({
      id: drawing.id,
      name: drawing.originalFilename || drawing.filename,
      filename: drawing.filename,
      description: `上传于 ${drawing.uploadTime?.toLocaleDateString?.() || '未知时间'}`,
      category: drawing.isCommonPart ? 'common-parts' : 'project-drawings',
      uploader: drawing.uploader?.name || '未知',
      uploadedAt: drawing.uploadTime
    }));

    res.json({
      success: true,
      query: searchTerm,
      projects: formatProjects,
      workers: formatWorkers,
      departments: formatDepartments,
      drawings: formatDrawings,
      totalCount: formatProjects.length + formatWorkers.length + formatDepartments.length + formatDrawings.length
    });

  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message
    });
  }
});

/**
 * 获取搜索建议
 * GET /api/search/suggestions?q=关键词
 */
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const searchTerm = q.trim();
    const suggestions = [];

    // 从项目名称获取建议
    const projects = await Project.findAll({
      where: {
        name: { [Op.like]: `%${searchTerm}%` }
      },
      attributes: ['name'],
      limit: 5
    });

    projects.forEach(project => {
      if (project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        suggestions.push({
          text: project.name,
          type: 'project',
          icon: '📋'
        });
      }
    });

    // 从工人姓名获取建议
    const workers = await Worker.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { department: { [Op.like]: `%${searchTerm}%` } }
        ]
      },
      attributes: ['name', 'department'],
      limit: 5
    });

    workers.forEach(worker => {
      suggestions.push({
        text: worker.name,
        type: 'worker',
        icon: '👥',
        extra: worker.department
      });
    });

    // 去重并限制数量
    const uniqueSuggestions = suggestions
      .filter((item, index, self) => 
        index === self.findIndex(s => s.text === item.text && s.type === item.type)
      )
      .slice(0, 8);

    res.json({
      success: true,
      suggestions: uniqueSuggestions
    });

  } catch (error) {
    console.error('获取搜索建议失败:', error);
    res.status(500).json({
      success: false,
      error: '获取搜索建议失败',
      message: error.message
    });
  }
});

/**
 * 高级过滤搜索
 * POST /api/search/advanced
 */
router.post('/advanced', authenticate, async (req, res) => {
  try {
    const { 
      query = '',
      type = 'all',
      filters = {},
      sort = 'relevance',
      limit = 50 
    } = req.body;

    const results = {
      projects: [],
      workers: [],
      drawings: [],
      total: 0
    };

    // 构建搜索条件
    const buildProjectWhere = () => {
      const where = {};
      
      if (query) {
        where[Op.or] = [
          { name: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } }
        ];
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt[Op.gte] = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.createdAt[Op.lte] = new Date(filters.dateTo);
        }
      }

      return where;
    };

    const buildWorkerWhere = () => {
      const where = {};
      
      if (query) {
        where[Op.or] = [
          { name: { [Op.like]: `%${query}%` } },
          { department: { [Op.like]: `%${query}%` } },
          { position: { [Op.like]: `%${query}%` } }
        ];
      }

      if (filters.department) {
        where.department = filters.department;
      }

      return where;
    };

    // 排序配置
    const getOrder = (sortType) => {
      switch (sortType) {
        case 'date_desc':
          return [['createdAt', 'DESC']];
        case 'date_asc':
          return [['createdAt', 'ASC']];
        case 'name':
          return [['name', 'ASC']];
        default:
          return [['updatedAt', 'DESC']];
      }
    };

    // 执行搜索
    if (type === 'all' || type === 'projects') {
      const projects = await Project.findAll({
        where: buildProjectWhere(),
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name']
          },
          {
            model: Worker,
            as: 'assignedWorker',
            attributes: ['id', 'name', 'department']
          }
        ],
        order: getOrder(sort),
        limit: Math.min(parseInt(limit), 100)
      });

      results.projects = projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        creator: project.creator,
        assignedWorker: project.assignedWorker,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        type: 'project'
      }));
    }

    if (type === 'all' || type === 'workers') {
      const workers = await Worker.findAll({
        where: buildWorkerWhere(),
        order: getOrder(sort),
        limit: Math.min(parseInt(limit), 100)
      });

      results.workers = workers.map(worker => ({
        id: worker.id,
        name: worker.name,
        department: worker.department,
        position: worker.position,
        phone: worker.phone,
        email: worker.email,
        createdAt: worker.createdAt,
        type: 'worker'
      }));
    }

    results.total = results.projects.length + results.workers.length + results.drawings.length;

    res.json({
      success: true,
      results,
      filters: filters,
      sort: sort,
      query: query
    });

  } catch (error) {
    console.error('高级搜索失败:', error);
    res.status(500).json({
      success: false,
      error: '高级搜索失败',
      message: error.message
    });
  }
});

module.exports = router;
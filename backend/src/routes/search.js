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
    
    if (!query || query.trim().length < 1) {
      return res.json({
        success: true,
        projects: [],
        workers: [],
        departments: [],
        drawings: [],
        materials: [],
        thicknessSpecs: [],
        employees: [],
        attendanceExceptions: []
      });
    }

    const searchTerm = query.trim();
    const searchPattern = `%${searchTerm}%`;
    
    // 导入模型
    const { Project, Worker, Department, Drawing, User, Material, ThicknessSpec, WorkerMaterial, Employee, AttendanceException } = require('../models');

    // 智能搜索词处理 - 增强数字和厚度识别
    const processSearchTerm = (searchTerm) => {
      const processed = {
        original: searchTerm,
        patterns: [searchTerm], // 原始搜索词
        thickness: null,
        isThickness: false,
        keywords: []
      };
      
      // 数字识别和厚度推断
      const numberMatch = searchTerm.match(/(\d+(?:\.\d+)?)/);
      if (numberMatch) {
        const number = numberMatch[1];
        processed.thickness = number;
        processed.isThickness = true;
        
        // 生成厚度相关的搜索模式
        processed.patterns.push(
          `${number}mm`,           // 4mm
          `${number}.0mm`,         // 4.0mm  
          `${number} mm`,          // 4 mm
          `厚度${number}`,         // 厚度4
          `${number}毫米`          // 4毫米
        );
        
        processed.keywords.push('厚度', 'thickness', 'mm', '毫米');
      }
      
      // 材料类型关键词
      const materialKeywords = {
        '碳': ['碳板', '碳钢', 'carbon', 'steel'],
        '钢': ['碳板', '碳钢', '钢板', 'steel'],
        '不锈': ['不锈钢', 'stainless'],
        '铝': ['铝板', 'aluminum', 'aluminium'],
        '铜': ['铜板', 'copper']
      };
      
      for (const [key, synonyms] of Object.entries(materialKeywords)) {
        if (searchTerm.includes(key)) {
          processed.patterns.push(...synonyms);
          processed.keywords.push(...synonyms);
        }
      }
      
      return processed;
    };
    
    const searchInfo = processSearchTerm(searchTerm);
    
    // 构建智能搜索条件
    const buildSearchConditions = (patterns) => {
      return patterns.map(pattern => ({ [Op.like]: `%${pattern}%` }));
    };
    
    const [projects, workers, departments, drawings, workerMaterials, thicknessSpecs, projectsByWorker, employees, attendanceExceptions, attendanceExceptionsByEmployee] = await Promise.all([
      // 1. 搜索项目 - 增强搜索范围，包括负责工人姓名
      Project.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: searchPattern } },
            { description: { [Op.like]: searchPattern } },
            ...buildSearchConditions(searchInfo.patterns).map(condition => ({ name: condition })),
            ...buildSearchConditions(searchInfo.patterns).map(condition => ({ description: condition }))
          ]
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Worker,
            as: 'assignedWorker', 
            attributes: ['id', 'name', 'department'],
            required: false
          },
          {
            model: Material,
            as: 'materials',
            attributes: ['id', 'status', 'completedDate'],
            include: [{
              model: ThicknessSpec,
              as: 'thicknessSpec',
              attributes: ['id', 'thickness', 'unit', 'materialType']
            }],
            required: false
          }
        ],
        limit: 15,
        order: [['updatedAt', 'DESC']]
      }),

      // 2. 搜索工人 - 保持原有逻辑
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
                { email: { [Op.like]: searchPattern } },
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ name: condition })),
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ department: condition }))
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
          },
          {
            model: Project,
            as: 'assignedProjects',
            attributes: ['id', 'name', 'status'],
            where: { 
              status: { [Op.in]: ['pending', 'in_progress'] }
            },
            required: false
          },
          {
            model: WorkerMaterial,
            as: 'materials',
            attributes: ['id', 'quantity'],
            where: { 
              quantity: { [Op.gt]: 0 }
            },
            include: [{
              model: ThicknessSpec,
              as: 'thicknessSpec',
              attributes: ['id', 'thickness', 'unit', 'materialType']
            }],
            required: false
          }
        ],
        limit: 12,
        order: [['name', 'ASC']]
      }),

      // 3. 搜索部门 - 保持原有逻辑
      Department.findAll({
        where: {
          [Op.and]: [
            { isActive: true },
            {
              [Op.or]: [
                { name: { [Op.like]: searchPattern } },
                { description: { [Op.like]: searchPattern } },
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ name: condition }))
              ]
            }
          ]
        },
        limit: 8,
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      }),

      // 4. 搜索图纸 - 保持原有逻辑
      Drawing.findAll({
        where: {
          [Op.or]: [
            { filename: { [Op.like]: searchPattern } },
            { originalFilename: { [Op.like]: searchPattern } },
            ...buildSearchConditions(searchInfo.patterns).map(condition => ({ filename: condition })),
            ...buildSearchConditions(searchInfo.patterns).map(condition => ({ originalFilename: condition }))
          ]
        },
        include: [
          {
            model: User,
            as: 'uploader',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        limit: 8,
        order: [['uploadTime', 'DESC']]
      }),

      // 5. 搜索板材库存 - 修复逻辑，支持更灵活的搜索
      WorkerMaterial.findAll({
        where: {
          quantity: { [Op.gt]: 0 }
        },
        include: [
          {
            model: Worker,
            as: 'worker',
            attributes: ['id', 'name', 'department', 'departmentId'],
            where: { status: 'active' },
            include: [{
              model: Department,
              as: 'departmentInfo',
              attributes: ['id', 'name'],
              required: false
            }],
            required: true
          },
          {
            model: ThicknessSpec,
            as: 'thicknessSpec',
            attributes: ['id', 'thickness', 'unit', 'materialType'],
            required: true
          }
        ],
        limit: 20,
        order: [['quantity', 'DESC']]
      }),

      // 6. 搜索厚度规格 - 修复数字匹配逻辑
      ThicknessSpec.findAll({
        where: {
          [Op.and]: [
            { isActive: true },
            {
              [Op.or]: [
                { thickness: { [Op.like]: searchPattern } },
                { materialType: { [Op.like]: searchPattern } },
                // 智能厚度匹配 - 修复逻辑
                ...(searchInfo.isThickness ? [
                  { thickness: { [Op.eq]: searchInfo.thickness } }, // 精确匹配
                  { thickness: { [Op.eq]: `${searchInfo.thickness}.0` } }, // 匹配 4.0
                  { thickness: { [Op.like]: `${searchInfo.thickness}.%` } }, // 匹配 4.x
                  { thickness: { [Op.like]: `%.${searchInfo.thickness}` } } // 匹配 x.4
                ] : []),
                ...buildSearchConditions(searchInfo.patterns).map(condition => 
                  ({ materialType: condition }))
              ]
            }
          ]
        },
        limit: 10,
        order: [['sortOrder', 'ASC'], ['thickness', 'ASC']]
      }),

      // 7. 新增：通过工人姓名搜索相关项目
      Project.findAll({
        where: {},
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: Worker,
            as: 'assignedWorker', 
            attributes: ['id', 'name', 'department'],
            where: {
              [Op.or]: [
                { name: { [Op.like]: searchPattern } },
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ name: condition }))
              ]
            },
            required: true // 必须有匹配的工人
          },
          {
            model: Material,
            as: 'materials',
            attributes: ['id', 'status', 'completedDate'],
            include: [{
              model: ThicknessSpec,
              as: 'thicknessSpec',
              attributes: ['id', 'thickness', 'unit', 'materialType']
            }],
            required: false
          }
        ],
        limit: 10,
        order: [['updatedAt', 'DESC']]
      }),

      // 8. 搜索员工（考勤模块）
      Employee.findAll({
        where: {
          [Op.and]: [
            { status: 'active' },
            {
              [Op.or]: [
                { name: { [Op.like]: searchPattern } },
                { employeeId: { [Op.like]: searchPattern } },
                { department: { [Op.like]: searchPattern } },
                { position: { [Op.like]: searchPattern } },
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ name: condition })),
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ department: condition })),
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ position: condition }))
              ]
            }
          ]
        },
        limit: 10,
        order: [['employeeId', 'ASC'], ['name', 'ASC']]
      }),

      // 9. 搜索考勤异常记录
      AttendanceException.findAll({
        where: {
          [Op.or]: [
            // 按异常原因搜索
            { leaveReason: { [Op.like]: searchPattern } },
            { overtimeReason: { [Op.like]: searchPattern } },
            { absentReason: { [Op.like]: searchPattern } },
            { notes: { [Op.like]: searchPattern } },
            // 按异常类型搜索（中文关键词映射到英文枚举值）
            ...(searchTerm.includes('请假') || searchTerm.includes('假') ? [{ exceptionType: 'leave' }] : []),
            ...(searchTerm.includes('加班') ? [{ exceptionType: 'overtime' }] : []),
            ...(searchTerm.includes('缺勤') || searchTerm.includes('旷工') ? [{ exceptionType: 'absent' }] : []),
            ...(searchTerm.includes('迟到') ? [{ exceptionType: 'late' }] : []),
            ...(searchTerm.includes('早退') ? [{ exceptionType: 'early' }] : []),
            // 智能搜索模式
            ...buildSearchConditions(searchInfo.patterns).map(condition => ({ leaveReason: condition })),
            ...buildSearchConditions(searchInfo.patterns).map(condition => ({ overtimeReason: condition })),
            ...buildSearchConditions(searchInfo.patterns).map(condition => ({ notes: condition }))
          ]
        },
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employeeId', 'name', 'department', 'position'],
            required: true // 必须有员工关联，但不限制员工搜索条件
          }
        ],
        limit: 15,
        order: [['date', 'DESC']]
      }),

      // 10. 通过员工姓名搜索考勤异常记录
      AttendanceException.findAll({
        where: {},
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employeeId', 'name', 'department', 'position'],
            where: {
              [Op.or]: [
                { name: { [Op.like]: searchPattern } },
                { employeeId: { [Op.like]: searchPattern } },
                ...buildSearchConditions(searchInfo.patterns).map(condition => ({ name: condition }))
              ]
            },
            required: true
          }
        ],
        limit: 15,
        order: [['date', 'DESC']]
      })
    ]);

    // 格式化搜索结果 - 增强版本，支持结果合并和智能过滤
    
    // 合并项目结果（直接匹配的项目 + 通过工人匹配的项目）
    const allProjects = [...projects, ...projectsByWorker];
    // 去重（按ID）
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.id === project.id)
    );
    
    const formatProjects = uniqueProjects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      assignedWorker: project.assignedWorker?.name || null,
      department: project.assignedWorker?.department || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      // 材料信息
      materials: project.materials?.map(material => ({
        id: material.id,
        status: material.status,
        completedDate: material.completedDate,
        thicknessSpec: material.thicknessSpec
      })) || []
    }));

    const formatWorkers = workers.map(worker => ({
      id: worker.id,
      name: worker.name,
      department: worker.departmentInfo?.name || worker.department || '未分配',
      position: worker.position,
      phone: worker.phone,
      status: worker.status,
      // 负责的项目信息
      assignedProjects: worker.assignedProjects?.map(project => ({
        id: project.id,
        name: project.name,
        status: project.status
      })) || [],
      // 库存信息
      materials: worker.materials?.map(material => {
        // 从MaterialDimension计算实际总量
        const totalQuantity = material.dimensions?.reduce((sum, dim) => sum + dim.quantity, 0) || 0;
        return {
          id: material.id,
          quantity: totalQuantity,
          thicknessSpec: material.thicknessSpec
        };
      }) || []
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

    // 智能过滤板材库存结果
    const filterWorkerMaterials = (materials) => {
      return materials.filter(material => {
        // 如果搜索的是工人姓名，匹配工人
        const workerMatch = buildSearchConditions(searchInfo.patterns).some(condition => {
          const pattern = condition[Op.like].replace(/%/g, '');
          return material.worker.name.includes(pattern);
        });
        
        // 如果搜索的是数字，匹配厚度
        const thicknessMatch = searchInfo.isThickness ? (
          material.thicknessSpec.thickness == searchInfo.thickness ||
          material.thicknessSpec.thickness == `${searchInfo.thickness}.0` ||
          material.thicknessSpec.thickness.startsWith(searchInfo.thickness)
        ) : false;
        
        // 如果搜索的是材料类型
        const materialMatch = buildSearchConditions(searchInfo.patterns).some(condition => {
          const pattern = condition[Op.like].replace(/%/g, '');
          const materialType = material.thicknessSpec.materialType || '碳板';
          return materialType.includes(pattern);
        });
        
        // 原始搜索词匹配
        const originalMatch = material.worker.name.includes(searchTerm) ||
          (material.thicknessSpec.materialType || '碳板').includes(searchTerm) ||
          material.thicknessSpec.thickness.includes(searchTerm);
        
        return workerMatch || thicknessMatch || materialMatch || originalMatch;
      });
    };
    
    const formatWorkerMaterials = filterWorkerMaterials(workerMaterials).map(workerMaterial => {
      const department = workerMaterial.worker.departmentInfo?.name || workerMaterial.worker.department || '未分配部门';
      
      // 从MaterialDimension计算实际总量
      const totalQuantity = workerMaterial.dimensions?.reduce((sum, dim) => sum + dim.quantity, 0) || 0;
      
      return {
        id: workerMaterial.id,
        quantity: totalQuantity,
        worker: {
          id: workerMaterial.worker.id,
          name: workerMaterial.worker.name,
          department: department
        },
        thicknessSpec: {
          id: workerMaterial.thicknessSpec.id,
          thickness: workerMaterial.thicknessSpec.thickness,
          unit: workerMaterial.thicknessSpec.unit,
          materialType: workerMaterial.thicknessSpec.materialType
        },
        // 用于搜索结果显示的名称
        name: `${workerMaterial.thicknessSpec.thickness}${workerMaterial.thicknessSpec.unit} ${workerMaterial.thicknessSpec.materialType || '碳板'}`,
        // 用于搜索结果显示的描述
        description: `库存 ${totalQuantity} 张 • ${workerMaterial.worker.name}`,
        department: department
      };
    });

    // 格式化厚度规格结果 - 保持原有逻辑
    const formatThicknessSpecs = thicknessSpecs.map(spec => ({
      id: spec.id,
      name: `${spec.thickness}${spec.unit} ${spec.materialType || '碳板'}`,
      thickness: spec.thickness,
      unit: spec.unit,
      materialType: spec.materialType || '碳板',
      description: `厚度规格 • ${spec.materialType || '碳板'} • ${spec.thickness}${spec.unit}`,
      category: 'thickness-spec',
      sortOrder: spec.sortOrder
    }));

    // 格式化员工结果（考勤模块）
    const formatEmployees = employees.map(employee => ({
      id: employee.id,
      name: employee.name,
      employeeId: employee.employeeId,
      department: employee.department || '未分配部门',
      position: employee.position || '未分配岗位',
      status: employee.status,
      dailyWorkHours: employee.dailyWorkHours || 9,
      description: `工号: ${employee.employeeId || '无'} • ${employee.department || '未分配部门'} • ${employee.position || '未分配岗位'}`,
      meta: `${employee.dailyWorkHours || 9}小时工作制`
    }));

    // 合并考勤异常搜索结果（按原因搜索 + 按员工搜索）
    const allAttendanceExceptions = [...attendanceExceptions, ...attendanceExceptionsByEmployee];
    // 去重（按ID）
    const uniqueAttendanceExceptions = allAttendanceExceptions.filter((exception, index, self) => 
      index === self.findIndex(e => e.id === exception.id)
    );

    // 格式化考勤异常记录结果
    const formatAttendanceExceptions = uniqueAttendanceExceptions.map(exception => {
      const employee = exception.employee;
      const exceptionTypeText = {
        'leave': '请假',
        'overtime': '加班',
        'absent': '缺勤',
        'late': '迟到',
        'early': '早退'
      }[exception.exceptionType] || exception.exceptionType;

      let details = '';
      const exceptionDate = new Date(exception.date).toLocaleDateString('zh-CN');
      
      switch (exception.exceptionType) {
        case 'leave':
          const leaveTypeText = {
            'sick': '病假',
            'personal': '事假',
            'annual': '年假',
            'compensatory': '调休'
          }[exception.leaveType] || '请假';
          const leaveHours = exception.leaveHours || 9;
          details = `${leaveTypeText} ${leaveHours}小时`;
          if (exception.leaveReason) {
            details += ` (${exception.leaveReason})`;
          }
          break;
        case 'overtime':
          const overtimeHours = (exception.overtimeMinutes || 0) / 60;
          details = `加班 ${Math.round(overtimeHours * 10) / 10}小时`;
          if (exception.overtimeReason) {
            details += ` (${exception.overtimeReason})`;
          }
          break;
        case 'absent':
          details = exception.absentReason || '缺勤';
          break;
        case 'late':
          details = `迟到${exception.lateArrivalTime ? ` 至${exception.lateArrivalTime}` : ''}`;
          break;
        case 'early':
          details = `早退${exception.earlyLeaveTime ? ` 于${exception.earlyLeaveTime}` : ''}`;
          break;
      }

      return {
        id: exception.id,
        name: `${employee?.name || '未知员工'} - ${exceptionDate} ${exceptionTypeText}`,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          position: employee.position
        } : null,
        date: exception.date,
        exceptionType: exception.exceptionType,
        description: details,
        meta: `${exceptionDate} • ${employee?.department || '未知部门'}`
      };
    });

    res.json({
      success: true,
      query: searchTerm,
      searchInfo: searchInfo, // 包含搜索分析信息
      projects: formatProjects,
      workers: formatWorkers,
      departments: formatDepartments,
      drawings: formatDrawings,
      materials: formatWorkerMaterials,
      thicknessSpecs: formatThicknessSpecs, // 新增厚度规格结果
      employees: formatEmployees, // 新增员工结果
      attendanceExceptions: formatAttendanceExceptions, // 新增考勤异常结果
      totalCount: formatProjects.length + formatWorkers.length + formatDepartments.length + formatDrawings.length + formatWorkerMaterials.length + formatThicknessSpecs.length + formatEmployees.length + formatAttendanceExceptions.length
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
        include: [
          {
            model: Department,
            as: 'departmentInfo',
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: getOrder(sort),
        limit: Math.min(parseInt(limit), 100)
      });

      results.workers = workers.map(worker => ({
        id: worker.id,
        name: worker.name,
        department: worker.departmentInfo?.name || '未分配',
        position: worker.position,
        phone: worker.phone,
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
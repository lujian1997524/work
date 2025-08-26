const express = require('express');
const { Op } = require('sequelize');
const { 
  Project, 
  Worker, 
  Department, 
  Drawing, 
  User, 
  Material,
  ThicknessSpec,
  WorkerMaterial,
  MaterialDimension,
  Employee,
  AttendanceException
} = require('../models');

const router = express.Router();

// 企业级全局智能搜索系统 - 重构版本
router.get('/', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.json({
        success: true,
        query: '',
        results: [],
        total: 0,
        categories: {},
        suggestions: [
          { text: '高春强', type: 'worker', description: '搜索工人及其所有相关项目和材料' },
          { text: '4mm', type: 'thickness', description: '搜索板材厚度规格及库存' },
          { text: '请假', type: 'attendance', description: '搜索考勤异常记录' },
          { text: '碳板', type: 'material', description: '搜索材料类型及相关信息' }
        ]
      });
    }

    const searchPattern = `%${searchTerm.trim()}%`;
    const searchTermLower = searchTerm.toLowerCase();
    
    console.log(`开始全局搜索: "${searchTerm}"`);
    
    // 搜索词预处理
    const processSearchTerm = (term) => {
      const processed = {
        patterns: [term, term.toLowerCase(), term.toUpperCase()],
        isThickness: false,
        thickness: null,
        isNumeric: false,
        number: null,
        isPerson: false,
        isMaterial: false,
        synonyms: []
      };
      
      // 厚度检测
      const thicknessKeywords = ['mm', '厚度', '板厚', 'thickness'];
      if (thicknessKeywords.some(keyword => term.includes(keyword))) {
        processed.isThickness = true;
        const match = term.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          processed.thickness = parseFloat(match[1]);
          processed.patterns.push(match[1], `${match[1]}mm`, `${match[1]}.0`);
        }
      }
      
      // 数字检测
      const numMatch = term.match(/(\d+(?:\.\d+)?)/);
      if (numMatch) {
        processed.isNumeric = true;
        processed.number = parseFloat(numMatch[1]);
        processed.patterns.push(numMatch[1], `${numMatch[1]}.0`);
      }
      
      // 材料类型同义词
      const materialKeywords = {
        '碳': ['碳板', '碳钢', 'carbon', 'steel'],
        '钢': ['碳板', '碳钢', '钢板', 'steel'],
        '不锈': ['不锈钢', 'stainless'],
        '铝': ['铝板', 'aluminum'],
        '铜': ['铜板', 'copper']
      };
      
      for (const [key, synonyms] of Object.entries(materialKeywords)) {
        if (searchTermLower.includes(key)) {
          processed.isMaterial = true;
          processed.patterns.push(...synonyms);
          processed.synonyms.push(...synonyms);
        }
      }
      
      // 考勤关键词映射
      const attendanceKeywords = {
        '请假': ['leave', '休假', '病假', '事假'],
        '加班': ['overtime', '超时工作'],
        '缺勤': ['absent', '旷工'],
        '迟到': ['late', '晚到'],
        '早退': ['early', '提前离开']
      };
      
      for (const [key, synonyms] of Object.entries(attendanceKeywords)) {
        if (searchTermLower.includes(key)) {
          processed.patterns.push(...synonyms);
        }
      }
      
      // 中文姓名检测
      if (/^[\u4e00-\u9fa5]{2,4}$/.test(term)) {
        processed.isPerson = true;
      }
      
      return processed;
    };
    
    const searchInfo = processSearchTerm(searchTerm);
    const results = [];
    const categories = {
      worker: { count: 0, label: '工人' },
      project: { count: 0, label: '项目' },
      employee: { count: 0, label: '员工' },
      thickness_spec: { count: 0, label: '板材规格' },
      drawing: { count: 0, label: '图纸' },
      material: { count: 0, label: '材料' },
      attendance: { count: 0, label: '考勤记录' }
    };

    // 并发执行所有搜索查询
    const searchPromises = [
      searchWorkers(searchPattern, searchInfo, limit),
      searchProjects(searchPattern, searchInfo, limit),
      searchEmployees(searchPattern, searchInfo, limit),
      searchThicknessSpecs(searchPattern, searchInfo, limit),
      searchDrawings(searchPattern, searchInfo, limit),
      searchMaterials(searchPattern, searchInfo, limit),
      searchAttendance(searchPattern, searchInfo, limit)
    ];

    const [
      workerResults,
      projectResults,
      employeeResults,
      thicknessResults,
      drawingResults,
      materialResults,
      attendanceResults
    ] = await Promise.all(searchPromises);

    // === 智能关联扩展 - 核心功能 ===
    // 为每个工人搜索结果添加其负责的项目到项目结果中
    const additionalProjectResults = [];
    const additionalMaterialResults = [];
    const additionalEmployeeResults = [];
    
    for (const workerResult of workerResults) {
      // 将工人的关联项目添加为独立的项目搜索结果
      if (workerResult.relatedData?.projects?.length > 0) {
        for (const project of workerResult.relatedData.projects) {
          additionalProjectResults.push({
            type: 'project',
            id: `project_from_worker_${project.id}`,
            title: project.name,
            subtitle: `${workerResult.title}负责的项目 · 状态: ${getStatusLabel(project.status, 'project')} · 优先级: ${getPriorityLabel(project.priority)}`,
            description: `由工人 ${workerResult.title} 负责，${project.materialsCount || 0} 种材料，完成度 ${project.completionRate || 0}%`,
            relevanceScore: 7, // 关联项目相关性较高
            metadata: {
              status: project.status,
              priority: project.priority,
              materialsCount: project.materialsCount,
              completionRate: project.completionRate,
              assignedWorker: workerResult.title,
              fromWorkerSearch: true,
              relatedWorker: workerResult.title
            },
            relatedData: {
              assignedWorker: {
                id: workerResult.id,
                name: workerResult.title
              },
              materials: [],
              fromWorker: workerResult.title
            },
            jumpTo: {
              type: 'project',
              id: project.id,
              path: '/',
              view: 'active',
              action: 'view_project_details',
              projectId: project.id
            }
          });
        }
      }

      // 将工人的关联材料添加为独立的材料搜索结果
      if (workerResult.relatedData?.materials?.length > 0) {
        for (const material of workerResult.relatedData.materials) {
          if (material.totalQuantity > 0) { // 只添加有库存的材料
            additionalMaterialResults.push({
              type: 'material',
              id: `material_from_worker_${material.id}`,
              title: `${material.thickness}${material.unit} ${material.materialType}`,
              subtitle: `${workerResult.title}的库存材料 · 数量: ${material.totalQuantity}件`,
              description: `工人 ${workerResult.title} 管理的 ${material.thickness}${material.unit} ${material.materialType}，库存 ${material.totalQuantity} 件`,
              relevanceScore: 6,
              metadata: {
                thickness: material.thickness,
                unit: material.unit,
                materialType: material.materialType,
                totalQuantity: material.totalQuantity,
                dimensionCount: material.dimensionCount,
                ownerWorker: workerResult.title,
                fromWorkerSearch: true,
                relatedWorker: workerResult.title
              },
              relatedData: {
                owner: {
                  id: workerResult.id,
                  name: workerResult.title
                },
                fromWorker: workerResult.title
              },
              jumpTo: {
                type: 'material',
                id: material.id,
                path: '/',
                view: 'materials',
                action: 'view_material_inventory',
                filters: { workerId: workerResult.id }
              }
            });
          }
        }
      }

      // 如果工人有对应的员工考勤记录，添加为员工搜索结果
      if (workerResult.relatedData?.attendanceStats) {
        additionalEmployeeResults.push({
          type: 'employee',
          id: `employee_from_worker_${workerResult.id}`,
          title: workerResult.title,
          subtitle: `工人"${workerResult.title}"的考勤记录 · ${workerResult.relatedData.attendanceStats.recentExceptions || 0}条记录`,
          description: `工人 ${workerResult.title} 的考勤情况，请假 ${workerResult.relatedData.attendanceStats.leaveCount || 0} 次，加班 ${workerResult.relatedData.attendanceStats.overtimeCount || 0} 次`,
          relevanceScore: 6,
          metadata: {
            employeeId: workerResult.relatedData.attendanceStats.employeeId,
            recentExceptions: workerResult.relatedData.attendanceStats.recentExceptions || 0,
            leaveCount: workerResult.relatedData.attendanceStats.leaveCount || 0,
            overtimeCount: workerResult.relatedData.attendanceStats.overtimeCount || 0,
            fromWorkerSearch: true,
            relatedWorker: workerResult.title
          },
          relatedData: {
            correspondingWorker: {
              id: workerResult.id,
              name: workerResult.title
            },
            fromWorker: workerResult.title
          },
          jumpTo: {
            type: 'employee',
            id: workerResult.id,
            path: '/',
            view: 'attendance',
            action: 'view_employee_attendance',
            employeeId: workerResult.relatedData.attendanceStats.employeeId
          }
        });
      }
    }

    // === 反向关联：为员工搜索结果添加对应工人的项目和材料 ===
    const additionalWorkerResults = [];
    
    for (const employeeResult of employeeResults) {
      // 如果员工有对应的工人记录，将工人添加为搜索结果
      if (employeeResult.relatedData?.correspondingWorker) {
        const worker = employeeResult.relatedData.correspondingWorker;
        
        // 获取该工人的项目和材料信息
        try {
          const workerProjects = await Project.findAll({
            where: { assignedWorkerId: worker.id },
            limit: 5,
            order: [['updatedAt', 'DESC']]
          });

          const workerMaterials = await WorkerMaterial.findAll({
            where: { workerId: worker.id },
            include: [
              {
                model: ThicknessSpec,
                as: 'thicknessSpec',
                required: false
              },
              {
                model: MaterialDimension,
                as: 'dimensions',
                required: false
              }
            ],
            limit: 5
          });

          additionalWorkerResults.push({
            type: 'worker',
            id: `worker_from_employee_${worker.id}`,
            title: worker.name,
            subtitle: `员工"${employeeResult.title}"对应的工人 · ${worker.departmentInfo?.name || worker.department || '未分配部门'} · ${worker.position}`,
            description: `员工 ${employeeResult.title} 在生产系统中的工人身份，负责 ${workerProjects.length} 个项目，管理 ${workerMaterials.length} 种材料`,
            relevanceScore: 8, // 员工对工人的关联度很高
            metadata: {
              phone: worker.phone,
              department: worker.departmentInfo?.name || worker.department || '未分配部门',
              position: worker.position,
              status: worker.status,
              totalProjects: workerProjects.length,
              totalInventory: workerMaterials.length,
              fromEmployeeSearch: true,
              relatedEmployee: employeeResult.title
            },
            relatedData: {
              projects: workerProjects.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                priority: p.priority
              })),
              materials: workerMaterials.map(wm => ({
                id: wm.id,
                thickness: wm.thicknessSpec?.thickness,
                unit: wm.thicknessSpec?.unit,
                materialType: wm.thicknessSpec?.materialType,
                totalQuantity: wm.dimensions?.reduce((sum, dim) => sum + (dim.quantity || 0), 0) || 0
              })),
              fromEmployee: employeeResult.title
            },
            jumpTo: {
              type: 'worker',
              id: worker.id,
              path: '/',
              view: 'materials',
              action: 'view_worker_details',
              filters: { workerId: worker.id }
            }
          });

          // 同时为该员工对应工人的项目添加到项目结果中
          for (const project of workerProjects) {
            additionalProjectResults.push({
              type: 'project',
              id: `project_from_employee_${project.id}`,
              title: project.name,
              subtitle: `员工"${employeeResult.title}"对应工人负责的项目 · 状态: ${getStatusLabel(project.status, 'project')}`,
              description: `员工 ${employeeResult.title} 对应的工人负责的项目，状态: ${getStatusLabel(project.status, 'project')}`,
              relevanceScore: 6,
              metadata: {
                status: project.status,
                priority: project.priority,
                assignedWorker: worker.name,
                fromEmployeeSearch: true,
                relatedEmployee: employeeResult.title
              },
              relatedData: {
                assignedWorker: {
                  id: worker.id,
                  name: worker.name
                },
                fromEmployee: employeeResult.title
              },
              jumpTo: {
                type: 'project',
                id: project.id,
                path: '/',
                view: 'active',
                action: 'view_project_details',
                projectId: project.id
              }
            });
          }
        } catch (error) {
          console.error(`获取员工 ${employeeResult.title} 对应工人的项目和材料失败:`, error.message);
        }
      }
    }

    // 合并所有结果
    const allResults = [
      ...workerResults,
      ...projectResults,
      ...additionalProjectResults,  // 从工人和员工关联的项目
      ...employeeResults,
      ...additionalEmployeeResults, // 从工人关联的员工
      ...additionalWorkerResults,   // 从员工关联的工人
      ...thicknessResults,
      ...drawingResults,
      ...materialResults,
      ...additionalMaterialResults, // 从工人关联的材料
      ...attendanceResults
    ];

    // === 智能去重逻辑 ===
    const deduplicatedResults = [];
    const seenIds = new Set();

    for (const result of allResults) {
      // 创建唯一标识符
      let uniqueKey;
      
      if (result.metadata?.fromWorkerSearch || result.metadata?.fromEmployeeSearch) {
        // 对于关联结果，使用原始ID + 类型作为标识
        const originalId = result.jumpTo?.projectId || result.jumpTo?.filters?.workerId || result.id.toString().replace(/^(project|material|employee|worker)_from_(worker|employee)_/, '');
        uniqueKey = `${result.type}_${originalId}`;
      } else {
        // 对于直接搜索结果，使用类型 + ID
        uniqueKey = `${result.type}_${result.id}`;
      }

      if (!seenIds.has(uniqueKey)) {
        seenIds.add(uniqueKey);
        deduplicatedResults.push(result);
      } else {
        console.log(`去重: 跳过重复结果 ${uniqueKey} - ${result.title}`);
      }
    }

    results.push(...deduplicatedResults);

    // 重新计算分类计数（基于去重后的结果）
    const finalCounts = {
      worker: 0,
      project: 0,
      employee: 0,
      thickness_spec: 0,
      drawing: 0,
      material: 0,
      attendance: 0
    };

    deduplicatedResults.forEach(result => {
      if (finalCounts.hasOwnProperty(result.type)) {
        finalCounts[result.type]++;
      }
    });

    // 更新分类计数
    categories.worker.count = finalCounts.worker;
    categories.project.count = finalCounts.project;
    categories.employee.count = finalCounts.employee;
    categories.thickness_spec.count = finalCounts.thickness_spec;
    categories.drawing.count = finalCounts.drawing;
    categories.material.count = finalCounts.material;
    categories.attendance.count = finalCounts.attendance;

    console.log(`关联扩展完成:`);
    console.log(`- 原始工人结果: ${workerResults.length}, 关联工人结果: ${additionalWorkerResults.length}`);
    console.log(`- 原始项目结果: ${projectResults.length}, 关联项目结果: ${additionalProjectResults.length}`);
    console.log(`- 原始员工结果: ${employeeResults.length}, 关联员工结果: ${additionalEmployeeResults.length}`);
    console.log(`- 原始材料结果: ${materialResults.length}, 关联材料结果: ${additionalMaterialResults.length}`);

    // 智能排序
    results.sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      
      const typePriority = { worker: 5, project: 4, employee: 3, thickness_spec: 2, drawing: 1, material: 1, attendance: 0 };
      const aPriority = typePriority[a.type] || 0;
      const bPriority = typePriority[b.type] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      const aMatch = a.title.toLowerCase().includes(searchTermLower);
      const bMatch = b.title.toLowerCase().includes(searchTermLower);
      
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      
      return 0;
    });

    // 生成搜索建议
    const suggestions = [];
    if (searchInfo.isPerson && categories.worker.count === 0) {
      suggestions.push({ text: `${searchTerm} + 项目`, type: 'worker', description: '尝试搜索相关项目信息' });
    }
    if (searchInfo.isThickness && categories.thickness_spec.count === 0) {
      suggestions.push({ text: `${searchTerm} + 库存`, type: 'material', description: '搜索板材库存信息' });
    }
    if (results.length === 0) {
      suggestions.push(
        { text: '高春强', type: 'worker', description: '搜索工人及相关信息' },
        { text: '4mm碳板', type: 'material', description: '搜索板材规格' },
        { text: '请假', type: 'attendance', description: '搜索考勤记录' }
      );
    }

    const totalResults = results.length;
    console.log(`搜索完成: "${searchTerm}" - ${totalResults} 个结果`);

    // 返回搜索结果
    res.json({
      success: true,
      query: searchTerm,
      results: results.slice(offset, offset + limit),
      total: totalResults,
      categories: categories,
      searchInfo: {
        isThickness: searchInfo.isThickness,
        isNumeric: searchInfo.isNumeric,
        isPerson: searchInfo.isPerson,
        isMaterial: searchInfo.isMaterial,
        patterns: searchInfo.patterns,
        synonyms: searchInfo.synonyms
      },
      suggestions: suggestions,
      pagination: {
        limit: limit,
        offset: offset,
        hasMore: totalResults > offset + limit
      },
      meta: {
        searchTime: Date.now(),
        version: '3.0.0',
        algorithm: 'enterprise_smart_search_v3'
      }
    });

  } catch (error) {
    console.error('全局搜索系统错误:', error);
    res.status(500).json({
      success: false,
      error: '搜索服务暂时不可用',
      message: error.message,
      suggestions: [
        { text: '高春强', type: 'worker', description: '尝试搜索工人信息' },
        { text: '项目', type: 'project', description: '尝试搜索项目' }
      ]
    });
  }
});

// === 辅助函数 ===

// 状态中文转换
const getStatusLabel = (status, type = 'project') => {
  const statusLabels = {
    project: {
      'pending': '待处理',
      'in_progress': '进行中', 
      'completed': '已完成',
      'cancelled': '已取消',
      'on_hold': '暂停',
      'draft': '草稿'
    },
    material: {
      'empty': '空闲',
      'pending': '待加工',
      'in_progress': '加工中',
      'completed': '已完成'
    },
    worker: {
      'active': '在职',
      'inactive': '离职',
      'on_leave': '请假'
    },
    employee: {
      'active': '在职',
      'inactive': '离职'
    },
    attendance: {
      'leave': '请假',
      'overtime': '加班', 
      'absent': '缺勤',
      'late': '迟到',
      'early': '早退'
    }
  };
  
  return statusLabels[type]?.[status] || status;
};

// 优先级中文转换
const getPriorityLabel = (priority) => {
  const priorityLabels = {
    'low': '低',
    'normal': '普通',
    'medium': '中等', 
    'high': '高',
    'urgent': '紧急',
    'critical': '关键'
  };
  
  return priorityLabels[priority] || priority;
};

// === 搜索函数实现 ===

// 1. 工人搜索
async function searchWorkers(searchPattern, searchInfo, limit) {
  try {
    const workers = await Worker.findAll({
      where: {
        [Op.and]: [
          { status: 'active' },
          {
            [Op.or]: [
              { name: { [Op.like]: searchPattern } },
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
          required: false
        }
      ],
      limit: Math.min(limit, 10),
      order: [['name', 'ASC']]
    });

    const results = [];
    for (const worker of workers) {
      // 获取工人负责的具体项目列表（包含详细信息）
      const projects = await Project.findAll({
        where: { assignedWorkerId: worker.id },
        include: [
          {
            model: Material,
            as: 'materials',
            required: false
          }
        ],
        order: [['updatedAt', 'DESC']],
        limit: 10 // 限制项目数量防止数据过多
      });

      // 获取工人的材料库存列表
      const workerMaterials = await WorkerMaterial.findAll({
        where: { workerId: worker.id },
        include: [
          {
            model: ThicknessSpec,
            as: 'thicknessSpec',
            required: false
          },
          {
            model: MaterialDimension,
            as: 'dimensions',
            required: false
          }
        ],
        limit: 8 // 限制材料数量
      });

      const departmentName = worker.departmentInfo ? worker.departmentInfo.name : '未分配部门';
      
      // 计算项目统计
      const projectStats = {
        total: projects.length,
        active: projects.filter(p => ['pending', 'in_progress'].includes(p.status)).length,
        completed: projects.filter(p => p.status === 'completed').length
      };

      // 计算材料库存统计
      const totalInventory = workerMaterials.reduce((sum, wm) => {
        const dimensionTotal = wm.dimensions?.reduce((dimSum, dim) => dimSum + (dim.quantity || 0), 0) || 0;
        return sum + dimensionTotal;
      }, 0);

      // 获取考勤信息（如果存在对应员工记录）
      let attendanceData = null;
      try {
        const employee = await Employee.findOne({
          where: { name: worker.name },
          include: [
            {
              model: AttendanceException,
              as: 'attendanceExceptions',
              limit: 3,
              order: [['date', 'DESC']],
              required: false
            }
          ]
        });
        
        if (employee) {
          const exceptions = employee.attendanceExceptions || [];
          attendanceData = {
            employeeId: employee.employeeId,
            recentExceptions: exceptions.length,
            leaveCount: exceptions.filter(e => e.exceptionType === 'leave').length,
            overtimeCount: exceptions.filter(e => e.exceptionType === 'overtime').length
          };
        }
      } catch (error) {
        console.error(`获取工人 ${worker.name} 考勤数据失败:`, error.message);
      }
      
      results.push({
        type: 'worker',
        id: worker.id,
        title: worker.name,
        subtitle: `${departmentName} · ${worker.position || '工人'} · ${worker.phone || ''}`,
        description: `负责 ${projectStats.total} 个项目 (${projectStats.active}个进行中)，管理 ${totalInventory} 件材料库存${attendanceData ? `，${attendanceData.recentExceptions}条考勤记录` : ''}`,
        relevanceScore: searchInfo.isPerson && worker.name.includes(searchInfo.patterns[0]) ? 10 : 7,
        metadata: {
          phone: worker.phone,
          email: worker.email,
          department: departmentName,
          position: worker.position,
          status: worker.status,
          totalProjects: projectStats.total,
          activeProjects: projectStats.active,
          completedProjects: projectStats.completed,
          totalInventory: totalInventory,
          efficiency: projectStats.total > 0 ? Math.round((projectStats.completed / projectStats.total) * 100) : 0
        },
        relatedData: {
          // 详细的项目列表
          projects: projects.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            priority: p.priority,
            materialsCount: p.materials?.length || 0,
            completionRate: p.materials?.length > 0 ? 
              Math.round((p.materials.filter(m => m.status === 'completed').length / p.materials.length) * 100) : 0,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          })),
          
          // 详细的材料库存列表
          materials: workerMaterials.map(wm => ({
            id: wm.id,
            thickness: wm.thicknessSpec?.thickness,
            unit: wm.thicknessSpec?.unit,
            materialType: wm.thicknessSpec?.materialType,
            code: wm.thicknessSpec?.code,
            totalQuantity: wm.dimensions?.reduce((sum, dim) => sum + (dim.quantity || 0), 0) || 0,
            dimensionCount: wm.dimensions?.length || 0
          })),

          // 项目统计
          projectStats: projectStats,
          
          // 材料统计  
          materialStats: { 
            total: workerMaterials.length,
            totalQuantity: totalInventory 
          },

          // 考勤数据（如果有）
          attendanceStats: attendanceData
        },
        jumpTo: {
          type: 'worker',
          id: worker.id,
          path: '/',
          view: 'materials',
          tab: 'inventory',
          action: 'view_worker_details',
          filters: { workerId: worker.id }
        }
      });
    }

    console.log(`工人搜索完成: ${results.length} 个结果`);
    return results;
  } catch (error) {
    console.error('工人搜索错误:', error);
    return [];
  }
}

// 2. 项目搜索
async function searchProjects(searchPattern, searchInfo, limit) {
  try {
    const projects = await Project.findAll({
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
          required: false
        },
        {
          model: Worker,
          as: 'assignedWorker',
          include: [
            {
              model: Department,
              as: 'departmentInfo',
              required: false
            }
          ],
          required: false
        }
      ],
      limit: Math.min(limit, 10),
      order: [['updatedAt', 'DESC'], ['priority', 'DESC']]
    });

    const results = [];
    for (const project of projects) {
      // 获取项目的详细材料列表
      const materials = await Material.findAll({
        where: { projectId: project.id },
        include: [
          {
            model: ThicknessSpec,
            as: 'thicknessSpec',
            required: false
          },
          {
            model: User,
            as: 'completedByUser',
            required: false
          }
        ],
        order: [['status', 'ASC'], ['updatedAt', 'DESC']]
      });

      // 获取项目图纸列表
      const drawings = await Drawing.findAll({
        where: { projectId: project.id },
        include: [
          {
            model: User,
            as: 'uploader',
            required: false
          }
        ],
        limit: 5,
        order: [['uploadDate', 'DESC']]
      });

      // 计算材料统计
      const materialStats = {
        total: materials.length,
        completed: materials.filter(m => m.status === 'completed').length,
        inProgress: materials.filter(m => m.status === 'in_progress').length,
        pending: materials.filter(m => m.status === 'pending').length
      };

      const completionRate = materialStats.total > 0 ? Math.round((materialStats.completed / materialStats.total) * 100) : 0;
      const progressRate = materialStats.total > 0 ? Math.round(((materialStats.completed + materialStats.inProgress) / materialStats.total) * 100) : 0;

      // 计算项目复杂度
      const complexityScore = Math.min(10, Math.round((materialStats.total * 0.4 + drawings.length * 0.6)));

      results.push({
        type: 'project',
        id: project.id,
        title: project.name,
        subtitle: `${getStatusLabel(project.status, 'project')} · 负责人: ${project.assignedWorker?.name || '未分配'} · 优先级: ${getPriorityLabel(project.priority)}`,
        description: `${materialStats.total} 种板材 (${materialStats.completed}已完成)，${drawings.length} 个图纸，完成度 ${completionRate}%，复杂度 ${complexityScore}/10`,
        relevanceScore: project.name.toLowerCase().includes(searchInfo.patterns[0].toLowerCase()) ? 9 : 6,
        metadata: {
          status: project.status,
          priority: project.priority,
          creator: project.creator?.name,
          assignedWorker: project.assignedWorker?.name,
          department: project.assignedWorker?.departmentInfo?.name || project.assignedWorker?.department,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          completionRate: completionRate,
          progressRate: progressRate,
          complexityScore: complexityScore,
          materialCount: materialStats.total,
          drawingCount: drawings.length
        },
        relatedData: {
          // 详细的材料列表
          materials: materials.map(m => ({
            id: m.id,
            status: m.status,
            thickness: m.thicknessSpec?.thickness,
            unit: m.thicknessSpec?.unit,
            materialType: m.thicknessSpec?.materialType,
            code: m.thicknessSpec?.code,
            quantity: m.quantity,
            completedDate: m.completedDate,
            completedBy: m.completedByUser?.name,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt
          })),

          // 图纸列表
          drawings: drawings.map(d => ({
            id: d.id,
            filename: d.originalFilename || d.filename,
            uploadDate: d.uploadDate,
            uploader: d.uploader?.name,
            fileSize: d.fileSize,
            category: d.category,
            version: d.version
          })),

          // 负责工人详情
          assignedWorker: project.assignedWorker ? {
            id: project.assignedWorker.id,
            name: project.assignedWorker.name,
            phone: project.assignedWorker.phone,
            position: project.assignedWorker.position,
            department: project.assignedWorker.departmentInfo?.name || project.assignedWorker.department
          } : null,

          // 材料统计详情
          materialStats: materialStats,

          // 项目时间线
          timeline: [
            { event: '项目创建', date: project.createdAt, by: project.creator?.name },
            { event: '最近更新', date: project.updatedAt },
            ...materials.filter(m => m.completedDate).map(m => ({
              event: `材料完成: ${m.thicknessSpec?.materialType} ${m.thicknessSpec?.thickness}${m.thicknessSpec?.unit}`,
              date: m.completedDate,
              by: m.completedByUser?.name
            }))
          ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
        },
        jumpTo: {
          type: 'project',
          id: project.id,
          path: '/',
          view: 'active',
          action: 'view_project_details',
          projectId: project.id
        }
      });
    }

    console.log(`项目搜索完成: ${results.length} 个结果`);
    return results;
  } catch (error) {
    console.error('项目搜索错误:', error);
    return [];
  }
}

// 3. 员工考勤搜索
async function searchEmployees(searchPattern, searchInfo, limit) {
  try {
    const employees = await Employee.findAll({
      where: {
        [Op.and]: [
          { status: 'active' },
          {
            [Op.or]: [
              { name: { [Op.like]: searchPattern } },
              { employeeId: { [Op.like]: searchPattern } },
              { department: { [Op.like]: searchPattern } },
              { position: { [Op.like]: searchPattern } }
            ]
          }
        ]
      },
      limit: Math.min(limit, 10),
      order: [['name', 'ASC']]
    });

    const results = [];
    for (const employee of employees) {
      // 获取员工的详细考勤异常记录
      const attendanceExceptions = await AttendanceException.findAll({
        where: { employeeId: employee.id },
        limit: 10,
        order: [['date', 'DESC']]
      });

      // 计算考勤统计
      const attendanceStats = {
        total: attendanceExceptions.length,
        leave: attendanceExceptions.filter(e => e.exceptionType === 'leave').length,
        overtime: attendanceExceptions.filter(e => e.exceptionType === 'overtime').length,
        absent: attendanceExceptions.filter(e => e.exceptionType === 'absent').length,
        late: attendanceExceptions.filter(e => e.exceptionType === 'late').length,
        early: attendanceExceptions.filter(e => e.exceptionType === 'early').length
      };

      // 查找对应的工人信息
      let correspondingWorker = null;
      try {
        correspondingWorker = await Worker.findOne({
          where: { name: employee.name },
          include: [
            {
              model: Department,
              as: 'departmentInfo',
              required: false
            }
          ]
        });
      } catch (error) {
        console.error(`查找员工 ${employee.name} 对应工人失败:`, error.message);
      }

      results.push({
        type: 'employee',
        id: employee.id,
        title: employee.name,
        subtitle: `工号: ${employee.employeeId} · ${employee.department} · ${employee.position}`,
        description: `日工作 ${employee.dailyWorkHours}h，${attendanceStats.total} 条考勤记录 (请假${attendanceStats.leave}次，加班${attendanceStats.overtime}次)${correspondingWorker ? '，对应工人系统' : ''}`,
        relevanceScore: searchInfo.isPerson && employee.name.includes(searchInfo.patterns[0]) ? 8 : 5,
        metadata: {
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position,
          dailyWorkHours: employee.dailyWorkHours,
          status: employee.status,
          hireDate: employee.hireDate,
          totalExceptions: attendanceStats.total,
          efficiency: attendanceStats.total === 0 ? 100 : Math.max(0, 100 - attendanceStats.total * 2) // 简单的出勤率计算
        },
        relatedData: {
          // 详细的考勤异常记录
          attendanceExceptions: attendanceExceptions.map(ae => ({
            id: ae.id,
            date: ae.date,
            exceptionType: ae.exceptionType,
            leaveType: ae.leaveType,
            leaveHours: ae.leaveHours,
            overtimeMinutes: ae.overtimeMinutes,
            leaveReason: ae.leaveReason,
            overtimeReason: ae.overtimeReason,
            absentReason: ae.absentReason,
            earlyLeaveReason: ae.earlyLeaveReason,
            lateArrivalReason: ae.lateArrivalReason
          })),

          // 考勤统计详情
          attendanceStats: attendanceStats,

          // 对应工人信息（如果存在）
          correspondingWorker: correspondingWorker ? {
            id: correspondingWorker.id,
            name: correspondingWorker.name,
            phone: correspondingWorker.phone,
            position: correspondingWorker.position,
            department: correspondingWorker.departmentInfo?.name || correspondingWorker.department,
            status: correspondingWorker.status
          } : null,

          // 月度出勤分析
          monthlyStats: attendanceExceptions.reduce((stats, ae) => {
            const month = ae.date.substring(0, 7); // YYYY-MM
            if (!stats[month]) {
              stats[month] = { total: 0, leave: 0, overtime: 0, absent: 0 };
            }
            stats[month].total++;
            if (ae.exceptionType === 'leave') stats[month].leave++;
            if (ae.exceptionType === 'overtime') stats[month].overtime++;
            if (ae.exceptionType === 'absent') stats[month].absent++;
            return stats;
          }, {})
        },
        jumpTo: {
          type: 'employee',
          id: employee.id,
          path: '/',
          view: 'attendance',
          action: 'view_employee_attendance',
          employeeId: employee.employeeId
        }
      });
    }

    console.log(`员工搜索完成: ${results.length} 个结果`);
    return results;
  } catch (error) {
    console.error('员工搜索错误:', error);
    return [];
  }
}

// 4. 厚度规格搜索
async function searchThicknessSpecs(searchPattern, searchInfo, limit) {
  try {
    const whereConditions = [
      { isActive: true },
      {
        [Op.or]: [
          { thickness: { [Op.like]: searchPattern } },
          { materialType: { [Op.like]: searchPattern } },
          { unit: { [Op.like]: searchPattern } },
          { code: { [Op.like]: searchPattern } }
        ]
      }
    ];

    // 数字匹配优化
    if (searchInfo.isThickness && searchInfo.thickness) {
      whereConditions[1][Op.or].push(
        { thickness: { [Op.eq]: searchInfo.thickness } },
        { thickness: { [Op.eq]: `${searchInfo.thickness}.0` } }
      );
    }

    const thicknessSpecs = await ThicknessSpec.findAll({
      where: { [Op.and]: whereConditions },
      limit: Math.min(limit, 8),
      order: [['sortOrder', 'ASC'], ['materialType', 'ASC'], ['thickness', 'ASC']]
    });

    const results = [];
    for (const spec of thicknessSpecs) {
      // 统计使用次数
      const [materialUsage, workerInventory] = await Promise.all([
        Material.count({ where: { thicknessSpecId: spec.id } }),
        WorkerMaterial.count({ where: { thicknessSpecId: spec.id } })
      ]);

      const usageScore = Math.min(10, Math.round((materialUsage * 0.5 + workerInventory * 0.3)));

      results.push({
        type: 'thickness_spec',
        id: spec.id,
        title: `${spec.thickness}${spec.unit} ${spec.materialType}`,
        subtitle: `规格代码: ${spec.code} · 排序: ${spec.sortOrder}`,
        description: `项目使用 ${materialUsage} 次，${workerInventory} 个工人有库存，使用频率 ${usageScore}/10`,
        relevanceScore: searchInfo.isThickness && parseFloat(spec.thickness) === searchInfo.thickness ? 10 : 
                        (searchInfo.isMaterial && spec.materialType.includes(searchInfo.patterns[0]) ? 8 : 4),
        metadata: {
          thickness: spec.thickness,
          unit: spec.unit,
          materialType: spec.materialType,
          code: spec.code,
          sortOrder: spec.sortOrder,
          isActive: spec.isActive,
          usageScore: usageScore,
          materialUsage: materialUsage,
          workerInventory: workerInventory
        },
        relatedData: {
          usage: { projects: materialUsage, workers: workerInventory }
        },
        jumpTo: {
          type: 'thickness_spec',
          id: spec.id,
          path: '/',
          view: 'materials',
          tab: 'inventory',
          action: 'filter_by_thickness',
          filters: { thicknessFilter: `${spec.materialType}_${spec.thickness}` }
        }
      });
    }

    console.log(`厚度规格搜索完成: ${results.length} 个结果`);
    return results;
  } catch (error) {
    console.error('厚度规格搜索错误:', error);
    return [];
  }
}

// 5. 图纸搜索
async function searchDrawings(searchPattern, searchInfo, limit) {
  try {
    const drawings = await Drawing.findAll({
      where: {
        [Op.or]: [
          { filename: { [Op.like]: searchPattern } },
          { originalFilename: { [Op.like]: searchPattern } },
          { category: { [Op.like]: searchPattern } }
        ]
      },
      include: [
        {
          model: Project,
          as: 'project',
          required: false
        },
        {
          model: User,
          as: 'uploader',
          required: false
        }
      ],
      limit: Math.min(limit, 8),
      order: [['uploadDate', 'DESC']]
    });

    const results = [];
    for (const drawing of drawings) {
      const fileSize = drawing.fileSize ? Math.round(drawing.fileSize / 1024) : 0;
      const isRecent = new Date() - new Date(drawing.uploadDate) < 30 * 24 * 60 * 60 * 1000;

      results.push({
        type: 'drawing',
        id: drawing.id,
        title: drawing.originalFilename || drawing.filename,
        subtitle: `项目: ${drawing.project?.name || '未关联'} · 版本: v${drawing.version || '1.0'}`,
        description: `上传者: ${drawing.uploader?.name || '未知'}，大小: ${fileSize}KB${isRecent ? '，最近上传' : ''}`,
        relevanceScore: (drawing.originalFilename || drawing.filename).toLowerCase().includes(searchInfo.patterns[0].toLowerCase()) ? 7 : 4,
        metadata: {
          filename: drawing.filename,
          originalFilename: drawing.originalFilename,
          fileSize: drawing.fileSize,
          category: drawing.category,
          version: drawing.version,
          uploadDate: drawing.uploadDate,
          uploader: drawing.uploader?.name,
          projectId: drawing.project?.id,
          projectName: drawing.project?.name,
          isRecent: isRecent
        },
        relatedData: {
          project: drawing.project ? {
            id: drawing.project.id,
            name: drawing.project.name
          } : null
        },
        jumpTo: {
          type: 'drawing',
          id: drawing.id,
          path: '/',
          view: drawing.project ? 'active' : 'drawings',
          action: 'view_drawing',
          projectId: drawing.project?.id,
          drawingId: drawing.id
        }
      });
    }

    console.log(`图纸搜索完成: ${results.length} 个结果`);
    return results;
  } catch (error) {
    console.error('图纸搜索错误:', error);
    return [];
  }
}

// 6. 材料搜索
async function searchMaterials(searchPattern, searchInfo, limit) {
  try {
    const materials = await Material.findAll({
      where: {
        [Op.or]: [
          { status: { [Op.like]: searchPattern } },
          { quantity: { [Op.like]: searchPattern } }
        ]
      },
      include: [
        {
          model: Project,
          as: 'project',
          required: false
        },
        {
          model: ThicknessSpec,
          as: 'thicknessSpec',
          required: false
        }
      ],
      limit: Math.min(limit, 8),
      order: [['updatedAt', 'DESC']]
    });

    const results = materials.map(material => ({
      type: 'material',
      id: material.id,
      title: `${material.thicknessSpec?.thickness}${material.thicknessSpec?.unit} ${material.thicknessSpec?.materialType}`,
      subtitle: `项目: ${material.project?.name || '未关联'} · 状态: ${material.status}`,
      description: `数量: ${material.quantity || 0}，项目材料状态管理`,
      relevanceScore: material.status?.includes(searchInfo.patterns[0]) ? 6 : 3,
      metadata: {
        status: material.status,
        quantity: material.quantity,
        projectId: material.project?.id,
        projectName: material.project?.name,
        thickness: material.thicknessSpec?.thickness,
        materialType: material.thicknessSpec?.materialType
      },
      relatedData: {
        project: material.project ? {
          id: material.project.id,
          name: material.project.name
        } : null,
        specification: material.thicknessSpec ? {
          thickness: material.thicknessSpec.thickness,
          unit: material.thicknessSpec.unit,
          materialType: material.thicknessSpec.materialType
        } : null
      },
      jumpTo: {
        type: 'material',
        id: material.id,
        path: '/',
        view: 'materials',
        action: 'view_material_details',
        filters: { materialId: material.id }
      }
    }));

    console.log(`材料搜索完成: ${results.length} 个结果`);
    return results;
  } catch (error) {
    console.error('材料搜索错误:', error);
    return [];
  }
}

// 7. 考勤记录搜索
async function searchAttendance(searchPattern, searchInfo, limit) {
  try {
    const attendanceExceptions = await AttendanceException.findAll({
      where: {
        [Op.or]: [
          { exceptionType: { [Op.like]: searchPattern } },
          { leaveType: { [Op.like]: searchPattern } },
          { leaveReason: { [Op.like]: searchPattern } },
          { overtimeReason: { [Op.like]: searchPattern } },
          { absentReason: { [Op.like]: searchPattern } }
        ]
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          required: true
        }
      ],
      limit: Math.min(limit, 8),
      order: [['date', 'DESC']]
    });

    const results = attendanceExceptions.map(exception => {
      const typeLabel = exception.exceptionType === 'leave' ? '请假' : 
                       exception.exceptionType === 'overtime' ? '加班' : 
                       exception.exceptionType === 'absent' ? '缺勤' : 
                       exception.exceptionType === 'late' ? '迟到' : 
                       exception.exceptionType === 'early' ? '早退' : '考勤异常';

      return {
        type: 'attendance',
        id: exception.id,
        title: `${exception.employee.name} - ${typeLabel}`,
        subtitle: `${exception.date} · ${exception.employee.department} · ${exception.leaveType || exception.exceptionType}`,
        description: `${exception.leaveReason || exception.overtimeReason || exception.absentReason || '无原因'}`,
        relevanceScore: exception.exceptionType?.includes(searchInfo.patterns[0]) ? 6 : 3,
        metadata: {
          employeeId: exception.employee.employeeId,
          employeeName: exception.employee.name,
          date: exception.date,
          exceptionType: exception.exceptionType,
          leaveType: exception.leaveType,
          hours: exception.leaveHours || exception.overtimeMinutes ? Math.round(exception.overtimeMinutes / 60) : 0,
          department: exception.employee.department
        },
        relatedData: {
          employee: {
            id: exception.employee.id,
            name: exception.employee.name,
            employeeId: exception.employee.employeeId,
            department: exception.employee.department,
            position: exception.employee.position
          }
        },
        jumpTo: {
          type: 'attendance_record',
          id: exception.id,
          path: '/',
          view: 'attendance',
          action: 'view_attendance_record',
          employeeId: exception.employee.employeeId,
          recordId: exception.id
        }
      };
    });

    console.log(`考勤搜索完成: ${results.length} 个结果`);
    return results;
  } catch (error) {
    console.error('考勤搜索错误:', error);
    return [];
  }
}

module.exports = router;
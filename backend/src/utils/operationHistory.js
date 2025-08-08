// 操作历史记录工具函数 - 扩展版，支持完整项目生命周期追踪
const { OperationHistory } = require('../models');

/**
 * 记录操作历史
 * @param {Object} data - 操作历史数据
 * @param {number} data.projectId - 项目ID
 * @param {string} data.operationType - 操作类型（支持完整项目生命周期的所有操作）
 * @param {string} data.operationDescription - 操作描述
 * @param {Object} data.details - 操作详细信息 (JSON)
 * @param {number} data.operatedBy - 操作人ID
 */
async function recordOperation(data) {
  try {
    const operationHistory = await OperationHistory.create({
      projectId: data.projectId,
      operationType: data.operationType,
      operationDescription: data.operationDescription,
      details: data.details || {},
      operatedBy: data.operatedBy
    });

    console.log(`操作历史已记录: ${data.operationDescription} (项目ID: ${data.projectId}, 操作人: ${data.operatedBy})`);
    return operationHistory;
  } catch (error) {
    console.error('记录操作历史失败:', error);
    // 不抛出错误，避免影响主要功能
    return null;
  }
}

/**
 * 记录材料状态更新历史
 */
async function recordMaterialUpdate(projectId, materialData, oldStatus, newStatus, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'material_update',
    operationDescription: `材料状态更新: ${materialData.thicknessSpec?.thickness || ''}${materialData.thicknessSpec?.unit || 'mm'} (${oldStatus} → ${newStatus})`,
    details: {
      materialId: materialData.id,
      thicknessSpecId: materialData.thicknessSpecId,
      thickness: materialData.thicknessSpec?.thickness,
      unit: materialData.thicknessSpec?.unit,
      oldStatus,
      newStatus,
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录图纸上传历史
 */
async function recordDrawingUpload(projectId, drawingData, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'drawing_upload',
    operationDescription: `上传图纸: ${drawingData.originalFilename} (版本 ${drawingData.version})`,
    details: {
      drawingId: drawingData.id,
      filename: drawingData.filename,
      originalFilename: drawingData.originalFilename,
      version: drawingData.version,
      fileSize: drawingData.fileSize,
      fileType: drawingData.fileType,
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录项目状态更新历史
 */
async function recordProjectUpdate(projectId, projectName, changes, operatedBy, operatorName) {
  const changeDescriptions = [];
  
  if (changes.status) {
    changeDescriptions.push(`状态: ${changes.oldStatus} → ${changes.status}`);
  }
  if (changes.priority) {
    changeDescriptions.push(`优先级: ${changes.oldPriority} → ${changes.priority}`);
  }
  if (changes.name) {
    changeDescriptions.push(`名称: ${changes.oldName} → ${changes.name}`);
  }
  if (changes.assignedWorkerId !== undefined) {
    changeDescriptions.push(`分配工人: ${changes.oldWorkerName || '无'} → ${changes.newWorkerName || '无'}`);
  }

  return await recordOperation({
    projectId,
    operationType: 'project_update',
    operationDescription: `项目更新: ${projectName} (${changeDescriptions.join(', ')})`,
    details: {
      projectName,
      changes,
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录项目创建历史
 */
async function recordProjectCreate(projectId, projectData, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'project_create',
    operationDescription: `创建项目: ${projectData.name}`,
    details: {
      projectName: projectData.name,
      description: projectData.description,
      status: projectData.status,
      priority: projectData.priority,
      assignedWorkerId: projectData.assignedWorkerId,
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录项目删除历史
 */
async function recordProjectDelete(projectId, projectName, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'project_delete',
    operationDescription: `删除项目: ${projectName}`,
    details: {
      projectName,
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录板材开始处理历史
 */
async function recordMaterialStart(projectId, materialData, operatedBy, operatorName) {
  const startTime = new Date();
  return await recordOperation({
    projectId,
    operationType: 'material_start',
    operationDescription: `开始处理板材: ${materialData.thicknessSpec?.thickness || ''}${materialData.thicknessSpec?.unit || 'mm'}`,
    details: {
      materialId: materialData.id,
      materialType: materialData.thicknessSpec?.materialType || '碳板',
      thickness: materialData.thicknessSpec?.thickness,
      unit: materialData.thicknessSpec?.unit,
      startTime: startTime.toISOString(),
      operatorName,
      projectName: materialData.project?.name
    },
    operatedBy
  });
}

/**
 * 记录板材完成加工历史
 */
async function recordMaterialComplete(projectId, materialData, startDate, operatedBy, operatorName) {
  const completeTime = new Date();
  const duration = startDate ? Math.round((completeTime.getTime() - new Date(startDate).getTime()) / (1000 * 60)) : null;
  
  return await recordOperation({
    projectId,
    operationType: 'material_complete',
    operationDescription: `完成板材加工: ${materialData.thicknessSpec?.thickness || ''}${materialData.thicknessSpec?.unit || 'mm'}`,
    details: {
      materialId: materialData.id,
      materialType: materialData.thicknessSpec?.materialType || '碳板',
      thickness: materialData.thicknessSpec?.thickness,
      unit: materialData.thicknessSpec?.unit,
      completeTime: completeTime.toISOString(),
      duration: duration ? `${duration}分钟` : null,
      operatorName,
      projectName: materialData.project?.name
    },
    operatedBy
  });
}

/**
 * 记录板材转移历史
 */
async function recordMaterialTransfer(projectId, materialData, fromWorker, toWorker, quantity, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'material_transfer',
    operationDescription: `转移板材: ${quantity}张 ${materialData.thicknessSpec?.thickness || ''}${materialData.thicknessSpec?.unit || 'mm'}`,
    details: {
      materialId: materialData.id,
      materialType: materialData.thicknessSpec?.materialType || '碳板',
      thickness: materialData.thicknessSpec?.thickness,
      unit: materialData.thicknessSpec?.unit,
      quantity,
      fromWorker: fromWorker?.name,
      toWorker: toWorker?.name,
      targetWorker: toWorker?.name,
      operatorName,
      projectName: materialData.project?.name
    },
    operatedBy
  });
}

/**
 * 记录需求添加历史
 */
async function recordRequirementAdd(projectId, requirementData, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'requirement_add',
    operationDescription: `添加材料需求: ${requirementData.materialType || ''} ${requirementData.thickness || ''}mm`,
    details: {
      requirementId: requirementData.id,
      materialType: requirementData.materialType,
      thickness: requirementData.thickness,
      dimensions: requirementData.dimensions,
      quantity: requirementData.quantity,
      specifications: requirementData.specifications,
      operatorName,
      projectName: requirementData.project?.name
    },
    operatedBy
  });
}

/**
 * 记录板材分配历史
 */
async function recordMaterialAllocate(projectId, allocationData, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'material_allocate',
    operationDescription: `分配板材: ${allocationData.quantity || ''}张 ${allocationData.materialType || ''}`,
    details: {
      materialType: allocationData.materialType,
      thickness: allocationData.thickness,
      quantity: allocationData.quantity,
      sources: allocationData.sources,
      allocatedTo: allocationData.allocatedTo,
      operatorName,
      projectName: allocationData.projectName
    },
    operatedBy
  });
}

/**
 * 记录项目状态变更历史
 */
async function recordProjectStatusChange(projectId, projectName, fromStatus, toStatus, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'project_status_change',
    operationDescription: `项目状态变更: ${fromStatus} → ${toStatus}`,
    details: {
      projectName,
      fromStatus,
      toStatus,
      changeTime: new Date().toISOString(),
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录工人分配历史
 */
async function recordWorkerAssign(projectId, projectName, oldWorker, newWorker, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'worker_assign',
    operationDescription: `工人分配: ${oldWorker?.name || '无'} → ${newWorker?.name || '无'}`,
    details: {
      projectName,
      oldWorkerId: oldWorker?.id,
      oldWorkerName: oldWorker?.name,
      newWorkerId: newWorker?.id,
      newWorkerName: newWorker?.name,
      assignTime: new Date().toISOString(),
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录项目里程碑历史
 */
async function recordProjectMilestone(projectId, projectName, milestone, description, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'project_milestone',
    operationDescription: `项目里程碑: ${milestone}`,
    details: {
      projectName,
      milestone,
      description,
      achieveTime: new Date().toISOString(),
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录优先级变更历史
 */
async function recordPriorityChange(projectId, projectName, oldPriority, newPriority, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'priority_change',
    operationDescription: `优先级变更: ${oldPriority} → ${newPriority}`,
    details: {
      projectName,
      oldPriority,
      newPriority,
      changeTime: new Date().toISOString(),
      operatorName
    },
    operatedBy
  });
}

/**
 * 记录图纸删除历史
 */
async function recordDrawingDelete(projectId, drawingData, operatedBy, operatorName) {
  return await recordOperation({
    projectId,
    operationType: 'drawing_upload', // 我们使用现有的类型，但描述会表明是删除
    operationDescription: `删除图纸: ${drawingData.originalFilename || drawingData.filename}`,
    details: {
      drawingId: drawingData.id,
      filename: drawingData.filename,
      originalFilename: drawingData.originalFilename,
      version: drawingData.version,
      fileSize: drawingData.fileSize,
      fileType: drawingData.fileType,
      operatorName,
      action: 'delete'
    },
    operatedBy
  });
}

module.exports = {
  recordOperation,
  recordMaterialUpdate,
  recordDrawingUpload,
  recordDrawingDelete,
  recordProjectUpdate,
  recordProjectCreate,
  recordProjectDelete,
  // 新增的项目生命周期追踪函数
  recordMaterialStart,
  recordMaterialComplete,
  recordMaterialTransfer,
  recordRequirementAdd,
  recordMaterialAllocate,
  recordProjectStatusChange,
  recordWorkerAssign,
  recordProjectMilestone,
  recordPriorityChange
};
// 操作历史记录工具函数
const { OperationHistory } = require('../models');

/**
 * 记录操作历史
 * @param {Object} data - 操作历史数据
 * @param {number} data.projectId - 项目ID
 * @param {string} data.operationType - 操作类型 ('material_update', 'drawing_upload', 'project_update', 'project_create', 'project_delete')
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

module.exports = {
  recordOperation,
  recordMaterialUpdate,
  recordDrawingUpload,
  recordProjectUpdate,
  recordProjectCreate,
  recordProjectDelete
};
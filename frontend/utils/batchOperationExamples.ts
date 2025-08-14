// 批量操作使用示例
// 展示如何在业务模块中使用批量操作Toast系统

import { batchOperationToastHelper, BatchOperationTracker, useBatchOperationTracker } from '@/utils/batchOperationToastHelper';

// 项目批量操作示例
export class ProjectBatchOperations {
  
  // 批量更新项目状态
  static async batchUpdateStatus(projectIds: number[], newStatus: string): Promise<void> {
    const tracker = new BatchOperationTracker(
      `项目状态更新为"${newStatus}"`,
      projectIds.length,
      'project-batch'
    );

    let successCount = 0;
    
    for (const projectId of projectIds) {
      try {
        // 模拟API调用更新项目状态
        // await updateProjectStatus(projectId, newStatus);
        
        tracker.updateProgress(`项目ID: ${projectId}`);
        successCount++;
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        tracker.addError(`项目${projectId}更新失败: ${error}`);
      }
    }

    tracker.complete({ successCount, newStatus });
  }

  // 批量分配项目给工人
  static async batchAssignToWorker(projectIds: number[], workerId: number, workerName: string): Promise<void> {
    const tracker = new BatchOperationTracker(
      `分配项目给${workerName}`,
      projectIds.length,
      'project-batch'
    );

    let assignedCount = 0;

    for (const projectId of projectIds) {
      try {
        // 模拟API调用分配项目
        // await assignProjectToWorker(projectId, workerId);
        
        tracker.updateProgress(`项目ID: ${projectId}`);
        assignedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        tracker.addError(`项目${projectId}分配失败: ${error}`);
      }
    }

    // 使用专门的批量分配Toast
    batchOperationToastHelper.projectBatchAssign(assignedCount, projectIds.length, workerName);
  }

  // 批量删除项目
  static async batchDelete(projectIds: number[]): Promise<void> {
    const tracker = new BatchOperationTracker(
      '删除项目',
      projectIds.length,
      'project-batch'
    );

    let deletedCount = 0;

    for (const projectId of projectIds) {
      try {
        // 模拟API调用删除项目
        // await deleteProject(projectId);
        
        tracker.updateProgress(`项目ID: ${projectId}`);
        deletedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        tracker.addError(`项目${projectId}删除失败: ${error}`);
      }
    }

    // 使用专门的批量删除Toast
    batchOperationToastHelper.projectBatchDelete(deletedCount, projectIds.length);
  }
}

// 材料批量操作示例
export class MaterialBatchOperations {
  
  // 批量更新材料状态
  static async batchUpdateMaterialStatus(materialIds: number[], newStatus: string): Promise<void> {
    const tracker = new BatchOperationTracker(
      `材料状态更新为"${newStatus}"`,
      materialIds.length,
      'material-batch'
    );

    let updatedCount = 0;

    for (const materialId of materialIds) {
      try {
        // 模拟API调用更新材料状态
        // await updateMaterialStatus(materialId, newStatus);
        
        tracker.updateProgress(`材料ID: ${materialId}`);
        updatedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        tracker.addError(`材料${materialId}状态更新失败: ${error}`);
      }
    }

    // 使用专门的材料批量状态更新Toast
    batchOperationToastHelper.materialBatchStatusUpdate(updatedCount, materialIds.length, newStatus);
  }

  // 批量转移材料
  static async batchTransferMaterials(
    materialIds: number[], 
    fromWorkerId: number, 
    toWorkerId: number,
    fromWorkerName: string,
    toWorkerName: string
  ): Promise<void> {
    const tracker = new BatchOperationTracker(
      `转移材料从${fromWorkerName}到${toWorkerName}`,
      materialIds.length,
      'material-batch'
    );

    let transferredCount = 0;

    for (const materialId of materialIds) {
      try {
        // 模拟API调用转移材料
        // await transferMaterial(materialId, fromWorkerId, toWorkerId);
        
        tracker.updateProgress(`材料ID: ${materialId}`);
        transferredCount++;
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        tracker.addError(`材料${materialId}转移失败: ${error}`);
      }
    }

    // 使用专门的材料批量转移Toast
    batchOperationToastHelper.materialBatchTransfer(
      transferredCount, 
      materialIds.length, 
      fromWorkerName, 
      toWorkerName
    );
  }

  // 批量回收材料（回到empty状态）
  static async batchRecycleMaterials(materialIds: number[]): Promise<void> {
    const tracker = new BatchOperationTracker(
      '回收材料',
      materialIds.length,
      'material-batch'
    );

    let recycledCount = 0;

    for (const materialId of materialIds) {
      try {
        // 模拟API调用回收材料
        // await recycleMaterial(materialId);
        
        tracker.updateProgress(`材料ID: ${materialId}`);
        recycledCount++;
        
        await new Promise(resolve => setTimeout(resolve, 120));
        
      } catch (error) {
        tracker.addError(`材料${materialId}回收失败: ${error}`);
      }
    }

    // 使用专门的材料批量回收Toast
    batchOperationToastHelper.materialBatchRecycle(recycledCount, materialIds.length);
  }
}

// 工人批量操作示例
export class WorkerBatchOperations {
  
  // 批量创建工人
  static async batchCreateWorkers(workerData: any[], department: string): Promise<void> {
    const tracker = new BatchOperationTracker(
      `创建${department}部门工人`,
      workerData.length,
      'worker-batch'
    );

    let createdCount = 0;

    for (const worker of workerData) {
      try {
        // 模拟API调用创建工人
        // await createWorker(worker);
        
        tracker.updateProgress(`工人: ${worker.name}`);
        createdCount++;
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        tracker.addError(`工人${worker.name}创建失败: ${error}`);
      }
    }

    // 使用专门的工人批量创建Toast
    batchOperationToastHelper.workerBatchCreate(createdCount, workerData.length, department);
  }

  // 批量更改工人部门
  static async batchChangeDepartment(workerIds: number[], newDepartment: string): Promise<void> {
    const tracker = new BatchOperationTracker(
      `调整工人到${newDepartment}部门`,
      workerIds.length,
      'worker-batch'
    );

    let changedCount = 0;

    for (const workerId of workerIds) {
      try {
        // 模拟API调用更改工人部门
        // await changeWorkerDepartment(workerId, newDepartment);
        
        tracker.updateProgress(`工人ID: ${workerId}`);
        changedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        tracker.addError(`工人${workerId}部门调整失败: ${error}`);
      }
    }

    // 使用专门的工人批量部门调整Toast
    batchOperationToastHelper.workerBatchDepartmentChange(changedCount, workerIds.length, newDepartment);
  }
}

// 图纸批量操作示例
export class DrawingBatchOperations {
  
  // 批量上传图纸
  static async batchUploadDrawings(files: File[], projectId: number, projectName: string): Promise<void> {
    const tracker = new BatchOperationTracker(
      `上传图纸到项目"${projectName}"`,
      files.length,
      'drawing-batch'
    );

    let uploadedCount = 0;

    for (const file of files) {
      try {
        // 模拟API调用上传图纸
        // await uploadDrawing(file, projectId);
        
        tracker.updateProgress(`图纸: ${file.name}`);
        uploadedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        tracker.addError(`图纸${file.name}上传失败: ${error}`);
      }
    }

    // 使用专门的图纸批量上传Toast
    batchOperationToastHelper.drawingBatchUpload(uploadedCount, files.length, projectName);
  }

  // 批量移动图纸到其他项目
  static async batchMoveDrawings(drawingIds: number[], targetProjectId: number, targetProjectName: string): Promise<void> {
    const tracker = new BatchOperationTracker(
      `移动图纸到项目"${targetProjectName}"`,
      drawingIds.length,
      'drawing-batch'
    );

    let movedCount = 0;

    for (const drawingId of drawingIds) {
      try {
        // 模拟API调用移动图纸
        // await moveDrawing(drawingId, targetProjectId);
        
        tracker.updateProgress(`图纸ID: ${drawingId}`);
        movedCount++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        tracker.addError(`图纸${drawingId}移动失败: ${error}`);
      }
    }

    // 使用专门的图纸批量移动Toast
    batchOperationToastHelper.drawingBatchMove(movedCount, drawingIds.length, targetProjectName);
  }
}

// React Hook使用示例
export const useBatchOperationsExample = () => {
  const { createTracker, helper } = useBatchOperationTracker();

  // 自定义批量操作示例
  const executeCustomBatchOperation = async (items: any[], operationName: string) => {
    const tracker = createTracker(operationName, items.length, 'mixed-batch');

    for (let i = 0; i < items.length; i++) {
      try {
        // 执行具体操作
        await processItem(items[i]);
        tracker.updateProgress(`处理项目 ${i + 1}`);
      } catch (error) {
        tracker.addError(`第${i + 1}项处理失败: ${error}`);
      }
    }

    tracker.complete();
  };

  const processItem = async (item: any) => {
    // 模拟处理逻辑
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  return {
    executeCustomBatchOperation,
    helper,
    // 公开其他批量操作类
    ProjectBatchOperations,
    MaterialBatchOperations,
    WorkerBatchOperations,
    DrawingBatchOperations
  };
};

// 批量操作错误处理示例
export const handleBatchOperationError = (operationType: string, error: string) => {
  batchOperationToastHelper.error(`批量${operationType}执行失败: ${error}`);
};

// 批量操作成功处理示例
export const handleBatchOperationSuccess = (operationType: string, successCount: number, total: number) => {
  if (successCount === total) {
    batchOperationToastHelper.info(`批量${operationType}全部成功完成，共处理${total}项`);
  } else {
    batchOperationToastHelper.info(`批量${operationType}部分成功，成功${successCount}项，共${total}项`);
  }
};
/**
 * 前端适配：基于MaterialDimension单一数据源的逻辑
 * 彻底简化数量计算，不再需要复杂的比例换算
 */

// 1. 简化的获取可用尺寸逻辑
const getAvailableDimensions = (workerId: number, thicknessSpecId: number) => {
  // 直接从MaterialDimension获取，不再需要WorkerMaterial的quantity字段
  const dimensions = materialDimensions.filter(dim => 
    dim.workerId === workerId && 
    dim.thicknessSpecId === thicknessSpecId &&
    dim.quantity > 0
  );
  
  // 就这么简单！不需要任何计算
  return dimensions;
};

// 2. 获取总量（简单加法）
const getTotalQuantity = (workerId: number, thicknessSpecId: number) => {
  const dimensions = getAvailableDimensions(workerId, thicknessSpecId);
  return dimensions.reduce((sum, dim) => sum + dim.quantity, 0);
};

// 3. 分配逻辑（直接操作具体尺寸）
const allocateMaterial = async (dimensionId: number, quantity: number) => {
  const response = await apiRequest('/api/materials/allocate-from-dimension', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      dimensionId,
      allocateQuantity: quantity
    })
  });
  
  return response;
};

// 4. 添加库存（指定具体尺寸）
const addMaterialStock = async (workerId: number, thicknessSpecId: number, width: number, height: number, quantity: number, notes?: string) => {
  const response = await apiRequest('/api/material-dimensions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      workerId,
      thicknessSpecId,
      width,
      height,
      quantity,
      notes
    })
  });
  
  return response;
};

// 5. 工人材料库存显示组件（简化版）
const WorkerMaterialSimple: React.FC<{
  workerId: number;
  thicknessSpecId: number;
}> = ({ workerId, thicknessSpecId }) => {
  const dimensions = getAvailableDimensions(workerId, thicknessSpecId);
  const totalQuantity = getTotalQuantity(workerId, thicknessSpecId);
  
  return (
    <div className="material-summary">
      <div className="total-quantity">
        总计: {totalQuantity}张
      </div>
      
      <div className="dimensions-detail">
        {dimensions.map(dim => (
          <div key={dim.id} className="dimension-item">
            {dim.width}×{dim.height}mm: {dim.quantity}张
            <button onClick={() => allocateMaterial(dim.id, 1)}>
              分配1张
            </button>
          </div>
        ))}
      </div>
      
      {/* 不再需要数据一致性检查！ */}
    </div>
  );
};

export { 
  getAvailableDimensions, 
  getTotalQuantity, 
  allocateMaterial, 
  addMaterialStock,
  WorkerMaterialSimple 
};
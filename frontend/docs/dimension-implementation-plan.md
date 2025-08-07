# 板材尺寸管理 - 完整实现方案与组件联调

## 第一阶段：数据库与API扩展

### 1. 数据库结构创建

```sql
-- 板材尺寸详情表
CREATE TABLE material_dimensions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    worker_material_id INT NOT NULL COMMENT '工人板材记录ID',
    width DECIMAL(10,2) COMMENT '宽度（mm）',
    height DECIMAL(10,2) COMMENT '长度（mm）',
    quantity INT NOT NULL DEFAULT 0 COMMENT '该尺寸数量',
    notes TEXT COMMENT '备注（批次、供应商等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_material_id) REFERENCES worker_materials(id) ON DELETE CASCADE,
    INDEX idx_worker_material_id (worker_material_id),
    INDEX idx_dimensions (width, height)
);

-- 数量一致性触发器
DELIMITER $$
CREATE TRIGGER update_worker_material_quantity
AFTER INSERT ON material_dimensions
FOR EACH ROW
BEGIN
    UPDATE worker_materials 
    SET quantity = (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM material_dimensions 
        WHERE worker_material_id = NEW.worker_material_id
    )
    WHERE id = NEW.worker_material_id;
END$$
DELIMITER ;
```

### 2. API 扩展

```javascript
// 新增尺寸管理API
POST   /api/worker-materials/{workerMaterialId}/dimensions
GET    /api/worker-materials/{workerMaterialId}/dimensions
PUT    /api/worker-materials/dimensions/{dimensionId}
DELETE /api/worker-materials/dimensions/{dimensionId}

// 修改现有API返回格式
GET /api/worker-materials 
{
  "workers": [
    {
      "workerId": 1,
      "workerName": "张三",
      "materials": {
        "碳板_2.00mm": {
          "quantity": 15,
          "dimensions": [
            {
              "id": 1,
              "width": 1000,
              "height": 2000,
              "quantity": 8,
              "notes": "标准板材"
            },
            {
              "id": 2, 
              "width": 1200,
              "height": 2400,
              "quantity": 7,
              "notes": "大板材"
            }
          ]
        }
      }
    }
  ]
}
```

## 第二阶段：前端组件扩展

### 1. 可展开表格单元格组件

```typescript
// components/materials/ExpandableMaterialCell.tsx
interface ExpandableMaterialCellProps {
  materialKey: string;
  materialData: MaterialData;
  workerId: number;
  onEdit: () => void;
}

export const ExpandableMaterialCell: React.FC<ExpandableMaterialCellProps> = ({
  materialKey, materialData, workerId, onEdit
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { dimensions = [], quantity: totalQuantity } = materialData;
  const hasDimensions = dimensions.length > 0;

  return (
    <div className="flex flex-col items-center space-y-1">
      {/* 主要数量显示 */}
      <div 
        className={`px-3 py-1.5 rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 ${
          totalQuantity > 20 ? 'bg-green-100 text-green-800' :
          totalQuantity > 10 ? 'bg-yellow-100 text-amber-800' :
          totalQuantity > 0 ? 'bg-orange-100 text-orange-800' :
          'bg-gray-50 text-gray-400'
        } ${hasDimensions ? 'cursor-pointer hover:scale-105' : ''}`}
        onClick={() => hasDimensions && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-1">
          <span>{totalQuantity}张</span>
          {hasDimensions && (
            <ChevronDownIcon 
              className={`w-3 h-3 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          )}
        </div>
      </div>

      {/* 展开的尺寸详情 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full space-y-1 text-xs bg-gray-50 p-2 rounded border"
          >
            {dimensions.map(dim => (
              <div 
                key={dim.id}
                className="flex justify-between items-center hover:bg-gray-100 px-1 py-0.5 rounded"
              >
                <span className="text-gray-600">
                  {dim.width}×{dim.height}
                </span>
                <span className="font-medium text-gray-900">
                  {dim.quantity}张
                </span>
              </div>
            ))}
            <button 
              onClick={onEdit}
              className="w-full text-blue-600 hover:text-blue-700 text-xs py-1 border-t border-gray-200 mt-1"
            >
              编辑尺寸
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

### 2. 尺寸编辑组件

```typescript
// components/materials/DimensionManager.tsx
interface DimensionManagerProps {
  workerMaterialId: number;
  materialLabel: string;
  dimensions: MaterialDimension[];
  onUpdate: () => void;
}

export const DimensionManager: React.FC<DimensionManagerProps> = ({
  workerMaterialId, materialLabel, dimensions, onUpdate
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDimension, setNewDimension] = useState({
    width: '',
    height: '',
    quantity: '',
    notes: ''
  });

  const addDimension = async () => {
    // API调用添加尺寸
    const response = await apiRequest(`/api/worker-materials/${workerMaterialId}/dimensions`, {
      method: 'POST',
      body: JSON.stringify({
        width: parseFloat(newDimension.width),
        height: parseFloat(newDimension.height), 
        quantity: parseInt(newDimension.quantity),
        notes: newDimension.notes
      })
    });
    
    if (response.ok) {
      setNewDimension({ width: '', height: '', quantity: '', notes: '' });
      setShowAddForm(false);
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">{materialLabel}</h4>
        <Button 
          size="sm" 
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
        >
          + 添加尺寸
        </Button>
      </div>

      {/* 现有尺寸列表 */}
      <div className="space-y-2">
        {dimensions.map(dim => (
          <DimensionEditItem
            key={dim.id}
            dimension={dim}
            onUpdate={onUpdate}
            onDelete={onUpdate}
          />
        ))}
      </div>

      {/* 添加新尺寸表单 */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border rounded-lg p-4 bg-blue-50"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="宽度(mm)"
              value={newDimension.width}
              onChange={(e) => setNewDimension(prev => ({ ...prev, width: e.target.value }))}
            />
            <Input
              placeholder="长度(mm)"
              value={newDimension.height}
              onChange={(e) => setNewDimension(prev => ({ ...prev, height: e.target.value }))}
            />
            <Input
              placeholder="数量(张)"
              value={newDimension.quantity}
              onChange={(e) => setNewDimension(prev => ({ ...prev, quantity: e.target.value }))}
            />
            <Input
              placeholder="备注(可选)"
              value={newDimension.notes}
              onChange={(e) => setNewDimension(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end space-x-2 mt-3">
            <Button size="sm" variant="secondary" onClick={() => setShowAddForm(false)}>
              取消
            </Button>
            <Button size="sm" onClick={addDimension}>
              添加
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
```

## 第三阶段：与其他组件的联调

### 1. 项目创建流程扩展

```typescript
// components/materials/ProjectModal.tsx 扩展
interface MaterialRequirement {
  thicknessSpecId: number;
  materialType: string;
  thickness: string;
  totalQuantity: number;
  dimensionRequirements?: Array<{
    width: number;
    height: number;
    quantity: number;
    notes?: string;
  }>;
}

// 在项目创建表单中添加板材需求规格
const ProjectMaterialRequirements: React.FC = () => {
  const [materialReqs, setMaterialReqs] = useState<MaterialRequirement[]>([]);
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">板材需求</h3>
      {materialReqs.map((req, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span>{req.materialType} {req.thickness}mm</span>
            <span className="font-semibold">{req.totalQuantity}张</span>
          </div>
          
          {/* 尺寸需求明细 */}
          {req.dimensionRequirements?.map((dim, dimIndex) => (
            <div key={dimIndex} className="text-sm text-gray-600 ml-4">
              {dim.width}×{dim.height}mm: {dim.quantity}张
            </div>
          ))}
          
          <Button 
            size="xs" 
            variant="ghost"
            onClick={() => openDimensionSelector(index)}
          >
            指定尺寸需求
          </Button>
        </div>
      ))}
    </div>
  );
};
```

### 2. 活跃项目显示扩展

```typescript
// components/projects/ActiveProjectsCardView.tsx 扩展
const MaterialStatusWithDimensions: React.FC<{material: any}> = ({ material }) => {
  const [showDimensions, setShowDimensions] = useState(false);
  
  return (
    <div className="space-y-2">
      {/* 主要状态显示 */}
      <div className="flex justify-between items-center">
        <span>{material.materialType} {material.thickness}mm</span>
        <div className="flex items-center space-x-2">
          <StatusToggle 
            status={material.status}
            onChange={(newStatus) => onMaterialStatusChange(material.id, newStatus)}
          />
          {material.dimensions?.length > 0 && (
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className="text-blue-600 hover:text-blue-700"
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* 尺寸详情展开 */}
      {showDimensions && material.dimensions && (
        <div className="ml-4 space-y-1 text-sm text-gray-600">
          {material.dimensions.map((dim: any) => (
            <div key={dim.id} className="flex justify-between">
              <span>{dim.width}×{dim.height}mm</span>
              <span>{dim.quantity}张 ({dim.status})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 3. 板材分配流程扩展

```typescript
// components/materials/MaterialAllocationFlow.tsx 新组件
interface MaterialAllocationFlowProps {
  projectId: number;
  materialRequirement: MaterialRequirement;
  availableWorkers: WorkerMaterial[];
  onComplete: (allocation: MaterialAllocation) => void;
}

export const MaterialAllocationFlow: React.FC<MaterialAllocationFlowProps> = ({
  projectId, materialRequirement, availableWorkers, onComplete
}) => {
  const [selectedAllocations, setSelectedAllocations] = useState<Array<{
    workerId: number;
    workerName: string;
    allocatedDimensions: Array<{
      dimensionId: number;
      width: number;
      height: number;
      allocatedQuantity: number;
      availableQuantity: number;
    }>;
  }>>([]);

  const renderWorkerMaterials = (worker: WorkerMaterial) => {
    const relevantMaterial = worker.materials[materialRequirement.materialKey];
    if (!relevantMaterial) return null;

    return (
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">{worker.workerName}</span>
          <span>总库存: {relevantMaterial.quantity}张</span>
        </div>
        
        {/* 可分配的尺寸列表 */}
        <div className="space-y-2">
          {relevantMaterial.dimensions?.map(dim => (
            <div key={dim.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
              <span>{dim.width}×{dim.height}mm</span>
              <div className="flex items-center space-x-2">
                <span>可用: {dim.quantity}张</span>
                <Input
                  type="number"
                  min="0"
                  max={dim.quantity}
                  placeholder="分配数量"
                  className="w-20"
                  onChange={(e) => updateAllocation(worker.workerId, dim.id, parseInt(e.target.value))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold">
          分配 {materialRequirement.materialType} {materialRequirement.thickness}mm
        </h3>
        <p className="text-gray-600">需要总量: {materialRequirement.totalQuantity}张</p>
      </div>

      {/* 工人库存列表 */}
      <div className="space-y-4">
        {availableWorkers.map(worker => renderWorkerMaterials(worker))}
      </div>

      {/* 分配汇总 */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span>已分配总量: {calculateTotalAllocated()}张</span>
          <div className="space-x-2">
            <Button variant="secondary" onClick={() => onComplete(null)}>
              取消
            </Button>
            <Button 
              onClick={() => onComplete(selectedAllocations)}
              disabled={calculateTotalAllocated() !== materialRequirement.totalQuantity}
            >
              确认分配
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4. 全局数据同步机制

```typescript
// hooks/useMaterialDimensionsSync.ts
export const useMaterialDimensionsSync = () => {
  const syncDimensionUpdate = useCallback((dimensionUpdate: DimensionUpdate) => {
    // 1. 更新板材库存表格
    window.dispatchEvent(new CustomEvent('dimension-updated', {
      detail: { 
        workerId: dimensionUpdate.workerId,
        materialKey: dimensionUpdate.materialKey,
        dimensions: dimensionUpdate.dimensions
      }
    }));

    // 2. 更新活跃项目显示
    window.dispatchEvent(new CustomEvent('project-material-dimensions-changed', {
      detail: {
        projectId: dimensionUpdate.projectId,
        materialId: dimensionUpdate.materialId,
        availableDimensions: dimensionUpdate.dimensions
      }
    }));

    // 3. 更新库存统计
    window.dispatchEvent(new CustomEvent('inventory-stats-changed'));
  }, []);

  return { syncDimensionUpdate };
};

// 在各个组件中监听事件
useEffect(() => {
  const handleDimensionUpdate = (event: CustomEvent) => {
    // 更新本地状态
    fetchData();
  };

  window.addEventListener('dimension-updated', handleDimensionUpdate);
  return () => window.removeEventListener('dimension-updated', handleDimensionUpdate);
}, []);
```

### 5. 数据一致性保证

```typescript
// utils/dimensionValidator.ts
export class DimensionValidator {
  static validateQuantityConsistency(
    mainQuantity: number, 
    dimensions: MaterialDimension[]
  ): ValidationResult {
    const totalDimensionQuantity = dimensions.reduce((sum, dim) => sum + dim.quantity, 0);
    
    return {
      isValid: mainQuantity === totalDimensionQuantity,
      errors: mainQuantity !== totalDimensionQuantity 
        ? [`主记录数量(${mainQuantity})与尺寸明细总量(${totalDimensionQuantity})不一致`]
        : [],
      warnings: []
    };
  }

  static validateDimensionAllocation(
    requirement: MaterialRequirement,
    allocation: MaterialAllocation
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查数量匹配
    const totalAllocated = allocation.allocatedDimensions.reduce(
      (sum, dim) => sum + dim.allocatedQuantity, 0
    );

    if (totalAllocated !== requirement.totalQuantity) {
      errors.push(`分配数量(${totalAllocated})与需求数量(${requirement.totalQuantity})不匹配`);
    }

    // 检查尺寸匹配
    if (requirement.dimensionRequirements) {
      requirement.dimensionRequirements.forEach(reqDim => {
        const allocated = allocation.allocatedDimensions.find(
          alloc => alloc.width === reqDim.width && alloc.height === reqDim.height
        );
        
        if (!allocated || allocated.allocatedQuantity < reqDim.quantity) {
          warnings.push(`尺寸 ${reqDim.width}×${reqDim.height}mm 分配不足`);
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
```

## 实施计划

### 阶段1：基础架构（1-2天）
- ✅ 创建数据库表
- ✅ 实现API端点
- ✅ 添加数据校验

### 阶段2：核心组件（2-3天）
- ✅ 实现可展开表格单元格
- ✅ 创建尺寸管理组件
- ✅ 扩展编辑模态框

### 阶段3：组件集成（2-3天）
- ✅ 更新项目创建流程
- ✅ 扩展活跃项目显示
- ✅ 实现板材分配流程

### 阶段4：测试与优化（1-2天）
- ✅ 端到端测试
- ✅ 性能优化
- ✅ 用户体验调优

这样的实现方案确保了：
1. **数据一致性**：通过数据库约束和前端校验双重保证
2. **组件解耦**：各组件通过事件系统通信，保持独立性
3. **用户体验**：渐进式披露，不增加界面复杂度
4. **可扩展性**：为将来的需求预留扩展空间
5. **向后兼容**：不影响现有功能的使用
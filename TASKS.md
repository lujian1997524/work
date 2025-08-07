# 板材库存管理系统优化任务清单

## 📋 项目概述
优化和整合板材库存管理系统，包括项目联调、工人管理合并，以及新增的厚度筛选功能。

**重要业务背景**：
- **碳板**：主要材料，占日常使用量的 ~95%
- **锰板/不锈钢**：特殊材料，占日常使用量的 ~5%
- **优化策略**：界面布局和功能优先级以碳板为主，特殊材料采用折叠或次要显示

---

## 🎯 任务一：新建项目时板材厚度选择优化（含ProjectDetail联调）

### 需求描述
- 在新建项目时允许选择需要的板材厚度
- **不需要设置张数**，张数留空等待后续排版完成后填写
- 项目创建后自动为指定工人生成对应厚度的板材记录（数量为0）
- **ProjectDetail组件联调**：显示新创建的零数量板材记录，支持碳板优先显示
- 提供从项目详情快速跳转到材料管理的功能

### 技术实现方案
```typescript
// 1. 修改ProjectModal组件（碳板优先设计）
interface ProjectFormData {
  name: string
  priority: 'low' | 'medium' | 'high'
  assignedWorkerId: number
  requiredThickness: number[] // 新增：选择的厚度数组
  // 移除：initialQuantities - 不再在创建时设置数量
}

// 2. 厚度选择UI设计（碳板优先布局）
<FormField label="需要的板材厚度" required error={formErrors.selectedThicknessSpecs}>
  {/* 碳板区域 - 主要显示 */}
  <div className="mb-4">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-semibold text-blue-900 flex items-center">
        <FireIcon className="w-4 h-4 mr-1" />
        碳板厚度
        <Badge variant="primary" className="ml-2">主要材料 (95%)</Badge>
      </h4>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {carbonThicknessSpecs.map((spec) => (
        <ThicknessButton 
          key={spec.id}
          spec={spec}
          isSelected={selectedThickness.includes(spec.id)}
          onClick={() => handleThicknessToggle(spec.id)}
          priority="high"
        />
      ))}
    </div>
  </div>

  {/* 特殊材料区域 - 折叠显示 */}
  <Collapsible
    trigger={
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer">
        <span className="text-sm text-gray-700 flex items-center">
          <FolderIcon className="w-4 h-4 mr-1" />
          特殊材料 (5%)
        </span>
        <ChevronDownIcon className="w-4 h-4" />
      </div>
    }
  >
    <div className="mt-2 grid grid-cols-4 gap-2">
      {specialThicknessSpecs.map((spec) => (
        <ThicknessButton 
          key={spec.id}
          spec={spec}
          isSelected={selectedThickness.includes(spec.id)}
          onClick={() => handleThicknessToggle(spec.id)}
          priority="low"
        />
      ))}
    </div>
  </Collapsible>
</FormField>

// 3. 厚度按钮组件设计
const ThicknessButton: React.FC<{
  spec: ThicknessSpec
  isSelected: boolean
  onClick: () => void
  priority: 'high' | 'low'
}> = ({ spec, isSelected, onClick, priority }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
      priority === 'high'
        ? isSelected
          ? 'border-blue-500 bg-blue-500 text-white'
          : 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500'
        : isSelected
          ? 'border-gray-500 bg-gray-500 text-white'
          : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-500'
    }`}
  >
    <div className="text-center">
      <div className="font-medium">{spec.thickness}{spec.unit}</div>
      {spec.materialType && (
        <div className="text-xs opacity-75">{spec.materialType}</div>
      )}
    </div>
  </button>
)

// 4. 后端API调整
POST /api/projects/create-with-materials
{
  projectData: { name, priority, assignedWorkerId },
  requiredThickness: [2, 3, 4] // 选择的厚度
}
// 响应：自动为工人创建对应厚度的板材记录，数量设为0
```

### 实现步骤
1. [ ] 修改ProjectModal组件，添加厚度多选功能
2. [ ] 创建ThicknessMultiSelect组件
3. [ ] 调整后端API，支持批量创建板材记录
4. [ ] 更新事件通知机制
5. [ ] **联调ProjectDetail组件**，显示新创建的零数量板材记录
6. [ ] 测试项目创建流程

### ProjectDetail组件联调方案

#### **需求描述**
- ProjectDetail组件需要显示新创建项目的板材记录（数量为0）
- 支持在项目详情中查看选择的厚度规格
- 提供从项目详情快速跳转到材料管理的功能

#### **技术实现**
```typescript
// 1. ProjectDetail组件增强
interface ProjectDetailProps {
  projectId: number
  onBack: () => void
  onJumpToMaterials?: (projectId: number, workerId: number) => void // 新增
}

// 2. 板材记录显示区域（碳板优先）
<div className="space-y-4">
  {/* 碳板区域 - 主要显示 */}
  <div className="bg-blue-50 rounded-lg p-4">
    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
      🔥 碳板厚度
      <Badge variant="primary" className="ml-2">主要材料</Badge>
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {carbonMaterials.map(material => (
        <div key={material.id} className="bg-white rounded p-3 border border-blue-200">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-900">
              {material.quantity || 0}
            </div>
            <div className="text-xs text-gray-600">
              {material.thicknessSpec.thickness}{material.thicknessSpec.unit}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {material.status || '待填写数量'}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* 特殊材料区域 - 折叠显示 */}
  {specialMaterials.length > 0 && (
    <Collapsible
      trigger={
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
          <span className="text-sm font-medium text-gray-700">
            📁 特殊材料 ({specialMaterials.length}种)
          </span>
          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
        </div>
      }
    >
      <div className="mt-2 grid grid-cols-2 gap-2">
        {specialMaterials.map(material => (
          <div key={material.id} className="bg-gray-50 rounded p-2 text-center">
            <div className="text-sm font-medium">{material.quantity || 0}</div>
            <div className="text-xs text-gray-600">
              {material.thicknessSpec.thickness}{material.thicknessSpec.unit}
            </div>
          </div>
        ))}
      </div>
    </Collapsible>
  )}
</div>

// 3. 快速操作按钮
<div className="flex space-x-2 mt-4">
  <Button 
    variant="primary" 
    size="sm"
    onClick={() =>onJumpToMaterials?.(projectId, project.assignedWorkerId)}
  >
    管理板材库存
  </Button>
  <Button variant="ghost" size="sm">
    查看进度统计
  </Button>
</div>
```

#### **数据获取优化**
```typescript
// ProjectDetail组件数据获取
const fetchProjectWithMaterials = async () => {
  const response = await apiRequest(`/api/projects/${projectId}?include=materials,thicknessSpecs`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  if (response.ok) {
    const project = await response.json()
    
    // 按材料类型分组（碳板优先）
    const carbonMaterials = project.materials?.filter(m => 
      m.thicknessSpec.materialType === '碳板'
    ) || []
    
    const specialMaterials = project.materials?.filter(m => 
      m.thicknessSpec.materialType !== '碳板'
    ) || []
    
    setCarbonMaterials(carbonMaterials)
    setSpecialMaterials(specialMaterials)
  }
}
```

#### **联调流程**
1. **创建项目** → ProjectModal选择厚度 → 自动创建材料记录（数量=0）
2. **查看详情** → ProjectDetail显示分类材料记录 → 区分碳板/特殊材料
3. **管理库存** → 点击"管理板材库存"按钮 → 跳转到MaterialInventoryManager并筛选该项目
4. **实时同步** → 数量更新后ProjectDetail实时刷新显示

---

## 🎯 任务二：板材库存侧边栏厚度筛选功能

### 需求描述
- 在MaterialsSidebar中添加按厚度筛选的功能
- 显示每个厚度的总库存数量统计
- 支持点击厚度快速筛选对应的板材记录
- **优化重点**：以碳板为主要显示，特殊材料采用折叠设计

### 技术实现方案
```typescript
// 1. 侧边栏设计结构（优化版）
MaterialsSidebar (增强版)
├── 材料类型筛选
│   ├── 🔥 碳板 (T) - 主要显示区域，默认展开
│   │   ├── 全部碳板厚度 (总数统计)
│   │   ├── 2mm碳板 (数量 + 进度条)
│   │   ├── 3mm碳板 (数量 + 进度条)
│   │   └── 4mm碳板 (数量 + 进度条)
│   └── 📁 特殊材料 - 可折叠区域，默认收起
│       ├── ⚡ 不锈钢 (B) (总数)
│       └── 🔩 锰板 (M) (总数)
├── 快速筛选
│   ├── "仅显示碳板" (默认状态)
│   ├── "显示所有材料"
│   └── "仅显示特殊材料"
└── Tab切换 (inventory/workers)

// 2. 厚度统计数据结构（按材料类型分组）
interface MaterialTypeStats {
  materialType: '碳板' | '不锈钢' | '锰板'
  priority: 'primary' | 'secondary' // 碳板为primary
  totalQuantity: number
  thicknessStats: ThicknessStats[]
  utilizationRate: number // 使用率，碳板通常较高
}

interface ThicknessStats {
  thickness: number
  materialType: string
  totalQuantity: number
  inProgressQuantity: number
  completedQuantity: number
  workerCount: number
  isMainMaterial: boolean // 标记是否为主要材料（碳板）
}

// 3. 筛选组件设计（优化版）
<div className="space-y-4">
  {/* 碳板主要区域 */}
  <div className="bg-blue-50 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-blue-900 flex items-center">
        🔥 碳板 (主要材料)
        <Badge variant="primary" className="ml-2">{carbonStats.totalQuantity}张</Badge>
      </h3>
      <Button variant="ghost" size="xs" onClick={() => setShowCarbonDetails(!showCarbonDetails)}>
        {showCarbonDetails ? '收起' : '展开'}
      </Button>
    </div>
    
    {showCarbonDetails && (
      <div className="space-y-1">
        {carbonThicknessStats.map(stat => (
          <FilterButton
            key={`carbon-${stat.thickness}`}
            active={thicknessFilter === `碳板_${stat.thickness}`}
            onClick={() => setThicknessFilter(`碳板_${stat.thickness}`)}
            label={`${stat.thickness}mm`}
            count={stat.totalQuantity}
            progressBar={
              <ProgressBar 
                current={stat.completedQuantity} 
                total={stat.totalQuantity}
                size="sm"
              />
            }
            priority="high"
          />
        ))}
      </div>
    )}
  </div>

  {/* 特殊材料折叠区域 */}
  <div className="border rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-700 flex items-center">
        📁 特殊材料
        <Badge variant="secondary" className="ml-2">
          {specialMaterialsStats.totalQuantity}张
        </Badge>
      </h3>
      <Button 
        variant="ghost" 
        size="xs" 
        onClick={() => setShowSpecialMaterials(!showSpecialMaterials)}
      >
        {showSpecialMaterials ? '收起' : '展开'}
      </Button>
    </div>
    
    {showSpecialMaterials && (
      <div className="space-y-1 text-sm">
        <FilterButton label="⚡ 不锈钢" count={stainlessSteelStats.totalQuantity} />
        <FilterButton label="🔩 锰板" count={manganeseStats.totalQuantity} />
      </div>
    )}
  </div>

  {/* 快速筛选器 */}
  <div className="border-t pt-3">
    <h4 className="text-xs font-medium text-gray-500 mb-2">快速筛选</h4>
    <div className="grid grid-cols-1 gap-1">
      <QuickFilterButton 
        active={quickFilter === 'carbon'} 
        onClick={() => setQuickFilter('carbon')}
        label="仅碳板"
        count={carbonStats.totalQuantity}
        isDefault={true}
      />
      <QuickFilterButton 
        active={quickFilter === 'all'} 
        onClick={() => setQuickFilter('all')}
        label="所有材料"
        count={allMaterialsStats.totalQuantity}
      />
      <QuickFilterButton 
        active={quickFilter === 'special'} 
        onClick={() => setQuickFilter('special')}
        label="特殊材料"
        count={specialMaterialsStats.totalQuantity}
      />
    </div>
  </div>
</div>
```

### 界面优化策略
1. **默认状态**：只显示碳板相关数据，特殊材料折叠
2. **视觉层级**：碳板用蓝色高亮背景，特殊材料用普通边框
3. **统计优先级**：碳板显示详细进度条，特殊材料只显示总数
4. **快速操作**：提供"仅碳板"快捷筛选，默认激活

### 实现步骤
1. [ ] 设计MaterialTypeStats数据结构和API
2. [ ] 创建优化的厚度筛选组件（碳板优先）
3. [ ] 实现材料类型的折叠/展开逻辑
4. [ ] 修改MaterialsSidebar，集成新的筛选功能
5. [ ] 调整MaterialInventoryManager的筛选逻辑
6. [ ] 添加快速筛选功能
7. [ ] 优化性能和用户体验

---

## 🎯 任务三：工人管理合并到板材库存管理

### 需求描述
- 将工人管理功能整合到板材库存管理中
- 使用Tab导航切换"板材库存"和"工人管理"视图
- 保持所有原有功能，增加数据联动

### 技术实现方案
```typescript
// 1. 主组件结构调整
MaterialInventoryManager (增强版)
├── Header
│   ├── 标题和统计信息
│   └── TabNavigation
│       ├── "📦 板材库存" Tab
│       └── "👥 工人管理" Tab
├── Sidebar (统一侧边栏)
│   ├── 板材库存模式: 材料类型 + 厚度筛选
│   └── 工人管理模式: 部门筛选
└── MainContent
    ├── 板材库存视图 (原有功能)
    └── 工人管理视图 (整合功能)

// 2. Tab导航组件
interface TabNavigationProps {
  activeTab: 'inventory' | 'workers'
  onTabChange: (tab: 'inventory' | 'workers') => void
  inventoryCount: number
  workerCount: number
}

// 3. 工人管理视图增强
WorkerManagementView
├── 工人列表表格
├── 工人CRUD操作
├── 快捷操作按钮
│   ├── "查看板材分配" (跳转到板材库存并筛选该工人)
│   └── "分配板材" (快速分配板材给工人)
└── 工人板材统计汇总
```

### 实现步骤
1. [ ] 创建TabNavigation组件
2. [ ] 重构MaterialInventoryManager，添加Tab状态管理
3. [ ] 整合WorkerManagement为WorkerManagementView
4. [ ] 统一Sidebar逻辑，支持动态内容切换
5. [ ] 添加工人-板材快捷操作
6. [ ] 实现数据联动和状态同步
7. [ ] 优化用户体验和交互流程

---

## 🎯 任务四：项目联调优化

### 需求描述
- 优化项目管理与板材库存的联调机制
- 新建项目时自动创建板材记录（数量为0）
- 活跃项目显示板材完成进度
- 支持项目与板材库存间的快速跳转

### 技术实现方案
```typescript
// 1. 事件驱动联调
interface ProjectMaterialEvents {
  'project-created': {
    projectId: number
    workerId: number
    requiredThickness: number[] // 不包含数量，后续填写
  }
  'material-quantity-updated': {
    projectId: number
    progress: number // 完成进度百分比
  }
}

// 2. 项目进度计算
calculateProjectProgress = (projectId: number) => {
  const materials = getMaterialsByProject(projectId)
  const totalMaterials = materials.length
  const completedMaterials = materials.filter(m => m.status === 'completed').length
  return totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0
}

// 3. 快速跳转功能
// 在活跃项目表格添加"板材进度"列
<TableCell>
  <ProgressButton
    progress={projectProgress}
    onClick={() => jumpToMaterialInventory(projectId, workerId)}
    tooltip="点击查看板材详情"
  />
</TableCell>
```

### 实现步骤
1. [ ] 修改项目创建API，支持厚度选择（无数量）
2. [ ] 实现板材记录自动创建逻辑
3. [ ] 在活跃项目表格添加进度显示
4. [ ] 实现项目-板材快速跳转
5. [ ] 优化事件通知和数据同步
6. [ ] 测试完整的联调流程

---

## 🎯 任务五：活跃项目和过往项目卡片界面优化

### 需求描述
根据碳板95%使用率的业务特点，优化活跃项目和过往项目的卡片显示方式，突出碳板相关信息，简化特殊材料显示。保持现有的卡片式布局，不改变整体视觉感受。

### 活跃项目卡片优化方案

#### **当前结构**
```
ProjectTree (侧边栏) + MaterialsCardView (主内容区)
卡片式布局显示活跃项目，每个项目为一张卡片
```

#### **优化后结构**
```typescript
// 1. 活跃项目卡片重新设计
interface ActiveProjectCard {
  projectId: number
  projectName: string
  assignedWorker: string
  priority: 'high' | 'medium' | 'low'
  carbonProgress: {
    thickness2mm: { completed: number, total: number }
    thickness3mm: { completed: number, total: number }
    thickness4mm: { completed: number, total: number }
    overallProgress: number // 碳板整体完成度
  }
  specialMaterials: {
    stainlessSteel: number
    manganese: number
    hasSpecialMaterials: boolean
  }
  projectStatus: 'not_started' | 'in_progress' | 'near_completion'
  createdDate: string
  estimatedCompletion?: string
}

// 2. 优化后的卡片布局设计
<ActiveProjectCard className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  {/* 卡片头部 - 项目基本信息 */}
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{projectName}</h3>
        <div className="flex items-center mt-1 text-sm text-gray-600">
          <UserIcon className="w-4 h-4 mr-1" />
          {assignedWorker}
          <PriorityBadge priority={priority} className="ml-2" />
        </div>
      </div>
      <ProjectStatusIndicator 
        status={projectStatus}
        carbonProgress={carbonProgress.overallProgress}
      />
    </div>
  </CardHeader>

  {/* 卡片主体 - 碳板进度区域（重点显示） */}
  <CardContent className="py-4">
    <div className="bg-blue-50 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-900 flex items-center">
          🔥 碳板进度
          <Badge variant="primary" className="ml-2">
            {carbonProgress.overallProgress}%
          </Badge>
        </h4>
        <span className="text-xs text-blue-700">
          主要材料 (95%)
        </span>
      </div>
      
      {/* 碳板厚度进度条 */}
      <div className="space-y-2">
        {Object.entries(carbonProgress).filter(([key]) => key.includes('thickness')).map(([thickness, progress]) => (
          <div key={thickness} className="flex items-center space-x-3">
            <span className="text-xs font-medium text-blue-900 w-10">
              {thickness.replace('thickness', '').replace('mm', '')}mm
            </span>
            <div className="flex-1">
              <ProgressBar 
                value={progress.completed} 
                max={progress.total}
                color="blue"
                size="sm"
                showLabel={false}
              />
            </div>
            <span className="text-xs text-blue-700 w-16 text-right">
              {progress.completed}/{progress.total}
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* 特殊材料区域（简化显示） */}
    {specialMaterials.hasSpecialMaterials && (
      <div className="border rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-medium text-gray-700 flex items-center">
            📁 特殊材料
            <span className="ml-1 text-gray-500">(5%)</span>
          </h5>
          <Collapsible>
            <div className="flex space-x-2 text-xs">
              {specialMaterials.stainlessSteel > 0 && (
                <Badge variant="secondary" size="sm">B: {specialMaterials.stainlessSteel}</Badge>
              )}
              {specialMaterials.manganese > 0 && (
                <Badge variant="secondary" size="sm">M: {specialMaterials.manganese}</Badge>
              )}
            </div>
          </Collapsible>
        </div>
      </div>
    )}
  </CardContent>

  {/* 卡片底部 - 操作和时间信息 */}
  <CardFooter className="pt-3 border-t border-gray-100">
    <div className="flex items-center justify-between text-xs text-gray-500">
      <div className="flex items-center space-x-4">
        <span className="flex items-center">
          <CalendarIcon className="w-3 h-3 mr-1" />
          {createdDate}
        </span>
        {estimatedCompletion && (
          <span className="flex items-center">
            <ClockIcon className="w-3 h-3 mr-1" />
            预计 {estimatedCompletion}
          </span>
        )}
      </div>
      <div className="flex space-x-2">
        <Button variant="ghost" size="xs" onClick={() => handleViewDetails(projectId)}>
          查看详情
        </Button>
        <Button variant="ghost" size="xs" onClick={() => handleEditProject(projectId)}>
          编辑
        </Button>
      </div>
    </div>
  </CardFooter>
</ActiveProjectCard>
```

### 过往项目卡片优化方案

#### **当前结构**
```
PastProjectsTree (侧边栏) + PastProjectsCardView (主内容区)
卡片式布局显示过往项目，每个已完成项目为一张卡片
```

#### **优化后结构**
```typescript
// 1. 过往项目卡片数据结构
interface CompletedProjectCard {
  projectId: number
  projectName: string
  completedDate: string
  assignedWorker: string
  projectDuration: number // 项目总耗时（天）
  carbonMaterialsUsed: {
    total: number // 碳板总用量
    breakdown: { 
      thickness2mm: number, 
      thickness3mm: number, 
      thickness4mm: number 
    }
    efficiency: number // 碳板使用效率 %
  }
  specialMaterialsUsed: {
    total: number // 特殊材料总用量
    breakdown: {
      stainlessSteel: number
      manganese: number
    }
    hasSpecialMaterials: boolean
  }
  projectMetrics: {
    totalMaterials: number
    completionRate: number
    qualityScore?: number
  }
}

// 2. 优化后的过往项目卡片设计
<CompletedProjectCard className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
  {/* 卡片头部 */}
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{projectName}</h3>
        <div className="flex items-center mt-1 text-sm text-gray-600">
          <UserIcon className="w-4 h-4 mr-1" />
          {assignedWorker}
          <Badge variant="success" size="sm" className="ml-2">已完成</Badge>
        </div>
      </div>
      <div className="text-right text-xs text-gray-500">
        <div>完成时间</div>
        <div className="font-medium">{completedDate}</div>
      </div>
    </div>
  </CardHeader>

  {/* 卡片主体 - 碳板使用统计（重点显示） */}
  <CardContent className="py-4">
    <div className="bg-blue-50 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-900 flex items-center">
          🔥 碳板使用统计
          <Badge variant="primary" className="ml-2">
            {carbonMaterialsUsed.total}张
          </Badge>
        </h4>
        <div className="text-xs text-blue-700">
          效率: {carbonMaterialsUsed.efficiency}%
        </div>
      </div>
      
      {/* 碳板厚度使用分布 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-white rounded p-2">
          <div className="text-lg font-bold text-blue-900">
            {carbonMaterialsUsed.breakdown.thickness2mm}
          </div>
          <div className="text-xs text-gray-600">2mm</div>
        </div>
        <div className="text-center bg-white rounded p-2">
          <div className="text-lg font-bold text-blue-900">
            {carbonMaterialsUsed.breakdown.thickness3mm}
          </div>
          <div className="text-xs text-gray-600">3mm</div>
        </div>
        <div className="text-center bg-white rounded p-2">
          <div className="text-lg font-bold text-blue-900">
            {carbonMaterialsUsed.breakdown.thickness4mm}
          </div>
          <div className="text-xs text-gray-600">4mm</div>
        </div>
      </div>
    </div>

    {/* 特殊材料统计（简化显示） */}
    {specialMaterialsUsed.hasSpecialMaterials && (
      <div className="border rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">
            📁 特殊材料: {specialMaterialsUsed.total}张
          </span>
          <div className="flex space-x-2 text-xs">
            {specialMaterialsUsed.breakdown.stainlessSteel > 0 && (
              <span className="bg-gray-200 px-2 py-1 rounded">
                B: {specialMaterialsUsed.breakdown.stainlessSteel}
              </span>
            )}
            {specialMaterialsUsed.breakdown.manganese > 0 && (
              <span className="bg-gray-200 px-2 py-1 rounded">
                M: {specialMaterialsUsed.breakdown.manganese}
              </span>
            )}
          </div>
        </div>
      </div>
    )}
  </CardContent>

  {/* 卡片底部 - 项目指标和操作 */}
  <CardFooter className="pt-3 border-t border-gray-100">
    <div className="flex items-center justify-between">
      <div className="flex space-x-4 text-xs text-gray-500">
        <span className="flex items-center">
          <ClockIcon className="w-3 h-3 mr-1" />
          {projectDuration}天
        </span>
        <span className="flex items-center">
          <ChartBarIcon className="w-3 h-3 mr-1" />
          {projectMetrics.totalMaterials}张总用量
        </span>
        {projectMetrics.qualityScore && (
          <span className="flex items-center">
            <StarIcon className="w-3 h-3 mr-1" />
            质量 {projectMetrics.qualityScore}/10
          </span>
        )}
      </div>
      <div className="flex space-x-2">
        <Button variant="ghost" size="xs" onClick={() => handleViewProjectDetails(projectId)}>
          查看详情
        </Button>
        <Button variant="ghost" size="xs" onClick={() => handleExportReport(projectId)}>
          导出报告
        </Button>
      </div>
    </div>
  </CardFooter>
</CompletedProjectCard>
```

### 搜索和筛选优化

#### **活跃项目筛选**
```typescript
// 优化后的筛选选项（针对卡片布局）
interface ProjectFilters {
  // 按材料类型筛选 (默认显示碳板项目)
  materialType: 'carbon' | 'special' | 'all' // 默认: 'carbon'
  
  // 按碳板完成度筛选
  carbonProgress: 'not_started' | 'in_progress' | 'near_completion' | 'all'
  
  // 按工人筛选
  assignedWorker: string | 'all'
  
  // 按优先级筛选
  priority: 'high' | 'medium' | 'low' | 'all'
}

// 默认筛选状态：只显示有碳板需求的活跃项目
const defaultFilters: ProjectFilters = {
  materialType: 'carbon',
  carbonProgress: 'all',
  assignedWorker: 'all',
  priority: 'all'
}

// 卡片网格布局
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
  {filteredActiveProjects
    .filter(project => applyFilters(project, filters))
    .sort((a, b) => sortByCarbonPriority(a, b))
    .map(project => (
      <ActiveProjectCard key={project.id} {...project} />
    ))
  }
</div>
```

#### **过往项目搜索**
```typescript
// 过往项目搜索优化（针对卡片布局）
interface PastProjectSearch {
  // 按完成时间范围搜索
  dateRange: { start: Date, end: Date }
  
  // 按碳板使用量搜索
  carbonUsageRange: { min: number, max: number }
  
  // 按项目名称/工人搜索
  textSearch: string
  
  // 只显示使用特殊材料的项目
  hasSpecialMaterials: boolean
}

// 卡片时间线布局
<div className="space-y-6">
  {groupedPastProjects.map(([month, projects]) => (
    <div key={month} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 sticky top-0 bg-white py-2">
        {month} ({projects.length}个项目)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <CompletedProjectCard key={project.id} {...project} />
        ))}
      </div>
    </div>
  ))}
</div>
```

### 碳板优先的视觉设计

#### **颜色系统**
```typescript
// 碳板相关样式（主要）
const carbonStyles = {
  primaryBg: 'bg-blue-50',
  primaryBorder: 'border-blue-200',
  primaryText: 'text-blue-900',
  primaryAccent: 'bg-blue-500',
  progressBar: 'bg-blue-500',
  badge: 'bg-blue-100 text-blue-800'
}

// 特殊材料样式（次要）
const specialMaterialStyles = {
  secondaryBg: 'bg-gray-50',
  secondaryBorder: 'border-gray-200',
  secondaryText: 'text-gray-700',
  secondaryAccent: 'bg-gray-400',
  badge: 'bg-gray-100 text-gray-600'
}
```

#### **布局权重**
```typescript
// 卡片内容区域权重分配
<CardContent>
  {/* 碳板区域 - 占70%空间 */}
  <div className="min-h-32 mb-4"> 
    <CarbonProgressSection />
  </div>
  
  {/* 特殊材料区域 - 占30%空间，可折叠 */}
  <div className="min-h-8">
    <SpecialMaterialsSection collapsible />
  </div>
</CardContent>
```

### 实现步骤

1. [ ] 分析现有MaterialsCardView和PastProjectsCardView组件结构
2. [ ] 重新设计ActiveProjectCard组件（碳板进度重点显示）
3. [ ] 重新设计CompletedProjectCard组件（碳板使用统计重点显示）
4. [ ] 创建CarbonProgressSection组件
5. [ ] 创建SpecialMaterialsSection组件（可折叠）
6. [ ] 实现碳板优先的筛选和搜索逻辑
7. [ ] 更新卡片网格布局和时间线布局
8. [ ] 应用碳板优先的颜色系统和视觉层级
9. [ ] 测试响应式布局和用户体验
10. [ ] 优化卡片加载性能和动画效果

---

## 📋 开发优先级和确认流程
  
  // 按工人筛选
  assignedWorker: string | 'all'
  
  // 按优先级筛选
  priority: 'high' | 'medium' | 'low' | 'all'
}

// 默认筛选状态：只显示有碳板需求的活跃项目
const defaultFilters: ProjectFilters = {
  materialType: 'carbon',
  carbonProgress: 'all',
  assignedWorker: 'all',
  priority: 'all'
}
```

#### **过往项目搜索**
```typescript
// 过往项目搜索优化
interface PastProjectSearch {
  // 按完成时间范围搜索
  dateRange: { start: Date, end: Date }
  
  // 按碳板使用量搜索
  carbonUsageRange: { min: number, max: number }
  
  // 按项目名称/工人搜索
  textSearch: string
  
  // 只显示使用特殊材料的项目
  hasSpecialMaterials: boolean
}
```

### 实现步骤
1. [ ] 重新设计活跃项目表格列结构
2. [ ] 创建CarbonProgressCell组件
3. [ ] 创建SpecialMaterialsCell组件  
4. [ ] 优化ProjectStatusIndicator逻辑
5. [ ] 重新设计过往项目卡片布局
6. [ ] 实现碳板优先的筛选和搜索
7. [ ] 更新项目进度计算逻辑
8. [ ] 测试和优化用户体验

---

## 📋 开发优先级和确认流程

### Phase 1: 基础功能优化（碳板优先）
1. **任务二**: 板材库存侧边栏厚度筛选功能 ⭐⭐⭐
   - 重点：碳板展示优化，特殊材料折叠处理
2. **任务一**: 新建项目时板材厚度选择优化 ⭐⭐⭐
   - 重点：碳板厚度优先显示，常用厚度置顶

### Phase 2: 项目界面优化
3. **任务五**: 活跃项目和过往项目界面优化 ⭐⭐⭐
   - 重点：活跃项目表格碳板进度可视化
   - 重点：过往项目卡片碳板使用统计
4. **任务四**: 项目联调优化 ⭐⭐
   - 重点：碳板项目进度优先计算

### Phase 3: 功能整合
5. **任务三**: 工人管理合并到板材库存管理 ⭐⭐
   - 重点：碳板统计数据突出显示

### 界面优化原则
- **95/5原则**：界面设计以碳板为主（95%权重），特殊材料为辅（5%权重）
- **默认筛选**：系统默认显示碳板数据，特殊材料需要主动展开
- **视觉层级**：碳板用高亮色彩，特殊材料用灰色调
- **操作便捷**：碳板相关操作一键直达，特殊材料操作可适当增加步骤

### 表格列优化建议
当前表格：`序号-项目名-工人-2mm-3mm-4mm...-备注-开始时间-完成时间-图纸`

**优化建议**：
```
优化后表格布局：
序号 | 项目名 | 工人 | 🔥碳板厚度(2/3/4mm) | 📁特殊材料 | 备注 | 进度 | 图纸
     |       |     | [显示进度条]        | [折叠显示] |     |     |

碳板厚度列：
- 2mm/3mm/4mm 碳板横向显示，带进度条
- 使用更大的显示空间和更醒目的颜色

特殊材料列：
- 不锈钢/锰板 折叠在一个列中
- 点击展开查看详情，平时只显示是否有数据的图标
```

### 确认流程
- 每个任务开始前需要确认具体实现方案
- 每个实现步骤完成后需要确认效果
- 遇到技术问题时及时沟通调整方案

---

## 🔄 当前状态
- [ ] 等待确认开发优先级
- [ ] 等待确认第一个任务的具体实现方案
- [ ] 准备开始编码实现

**下一步**: 请确认是否从 "任务二：板材库存侧边栏厚度筛选功能" 开始实现？
# Toast智能提示系统实施文档

## 项目信息

**项目名称**: 激光切割生产管理系统 - Toast智能提示功能实施  
**文档版本**: v1.0  
**创建日期**: 2025-01-13  
**负责人**: Claude Code  
**技术栈**: Next.js 15.4.3 + React 18 + TypeScript + Zustand + Framer Motion

---

## 一、实施概述

### 1.1 实施目标

将现有的简单通知系统升级为智能化Toast轻提示系统，为激光切割生产管理系统的所有业务操作提供及时、清晰、智能的反馈提示。

### 1.2 实施原则

- **纯提示功能**: 专注信息传达，无复杂交互按钮
- **适度详细**: 消息内容清晰明确，避免冗长
- **真实场景**: 只针对实际存在的业务功能
- **无装饰符号**: 使用纯文字，避免emoji
- **音频集成**: 重要操作配备相应音效

### 1.3 核心文件结构

```
frontend/
├── components/ui/
│   ├── Toast.tsx                     # Toast核心组件
│   └── NotificationContainer.tsx     # 原有通知容器
├── stores/
│   └── notificationStore.ts         # 原有通知状态管理
├── utils/
│   ├── audioManager.ts              # 音频管理器
│   ├── sseManager.ts                # SSE管理器
│   └── notificationManager.ts       # 桌面通知管理
└── Toast智能提示系统实施文档.md       # 本文档
```

---

## 二、技术实现详情

### 2.1 Toast组件架构

#### 2.1.1 核心接口定义

```typescript
export interface ToastProps {
  id?: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info' | 
         // 项目管理
         'project-created' | 'project-updated' | 'project-deleted' | 
         'project-status-auto' | 'project-archived' | 'worker-reassigned' |
         // 材料管理（四状态循环）
         'material-allocated' | 'material-started' | 'material-completed' | 'material-recycled' |
         'stock-added' | 'stock-warning' | 'dimension-added' | 'material-transferred' |
         'strategy-deviation' | 'strategy-balanced' |
         // 图纸管理
         'file-uploading' | 'file-uploaded' | 'dxf-parsed' | 'common-part-tagged' | 'upload-error' |
         'version-updated' | 'version-conflict' | 'drawing-linked' |
         // 工人管理
         'worker-updated' | 'worker-added' | 'worker-removed' |
         'worker-overloaded' | 'worker-available' |
         // 实时协作
         'collaboration-notify' | 'sync-updated' | 'sync-completed' | 'sync-error' |
         'connection-lost' | 'connection-restored' |
         // 智能辅助
         'smart-suggestion' | 'pattern-insight' | 'efficiency-insight' |
         'workflow-optimization' | 'bottleneck-detected' |
         // 批量操作
         'batch-operation' | 'wancheng'
  
  duration?: number                    // 显示时长(毫秒)
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  persistent?: boolean                 // 是否持续显示
  showTime?: boolean                   // 显示时间戳
  showProgress?: boolean               // 显示进度条
  progress?: number                    // 进度百分比(0-100)
}
```

#### 2.1.2 useToast Hook核心方法

```typescript
// 基础通用方法
const { addToast, removeToast, clearAllToasts } = useToast()

// 项目管理专用方法
projectCreated(projectName: string)
projectUpdated(projectName: string) 
projectDeleted(projectName: string)
projectStatusAuto(projectName: string, newStatus: string, reason: string)
projectArchived(projectName: string)
workerReassigned(projectName: string, fromWorker: string, toWorker: string)

// 材料管理专用方法（四状态循环）
materialAllocated(materialType: string, projectName: string, quantity: number)
materialStarted(materialType: string, workerName: string)
materialCompleted(materialType: string, workerName?: string)
materialRecycled(materialType: string)
stockAdded(workerName: string, materialType: string, quantity: number)
stockWarning(workerName: string, materialType: string, currentStock: number, required: number)
dimensionAdded(materialType: string, dimensions: string, quantity: number)
materialTransferred(materialType: string, quantity: number, fromWorker: string, toWorker: string)
strategyDeviation(carbonRatio: number, target?: number)
strategyBalanced()

// 图纸管理专用方法
fileUploading(fileName: string, progress: number)
fileUploaded(fileName: string)
dxfParsed(fileName: string)
commonPartTagged(fileName: string)
versionUpdated(fileName: string, version: string)
versionConflict(fileName: string)
drawingLinked(fileName: string, projectName: string)

// 工人管理专用方法
workerUpdated(workerName: string, updateType: string)
workerAdded(workerName: string, department: string)
workerOverloaded(workerName: string, projectCount: number)
workerAvailable(workerName: string)

// 实时协作专用方法
collaborationNotify(userName: string, action: string)
syncUpdated(userName: string, updateType: string, itemName: string)
syncCompleted()
syncError()
connectionLost()
connectionRestored()

// 智能辅助专用方法
smartSuggestion(suggestion: string)
patternInsight(insight: string, pattern: string)
efficiencyInsight(insight: string)
workflowOptimization(tip: string, potentialSaving: string)
bottleneckDetected(bottleneck: string, solution: string)

// 批量操作专用方法
batchOperation(operation: string, count: number, result: 'success' | 'partial' | 'failed')
```

### 2.2 音频反馈集成

#### 2.2.1 音效映射规则

```typescript
const audioMapping = {
  // 成功类音效
  'material-completed': 'wancheng.wav',
  'material-started': 'success.wav',
  'project-created': 'success.wav',
  'stock-added': 'success.wav',
  'sync-completed': 'success.wav',
  
  // 警告类音效  
  'stock-warning': 'warning.wav',
  'strategy-deviation': 'warning.wav',
  'worker-overloaded': 'warning.wav',
  'version-conflict': 'warning.wav',
  
  // 错误类音效
  'sync-error': 'error.wav',
  'upload-error': 'error.wav',
  'connection-lost': 'error.wav',
  
  // 信息类音效
  'project-archived': 'info.wav',
  'material-recycled': 'info.wav',
  'connection-restored': 'info.wav'
}
```

#### 2.2.2 优先级音效覆盖

```typescript
// 优先级音效映射（覆盖默认音效）
if (priority === 'urgent') {
  soundType = 'error'     // 紧急使用错误音效
} else if (priority === 'high') {
  soundType = 'warning'   // 高优先级使用警告音效
}
```

---

## 三、业务场景实现

### 3.1 项目管理模块实现

#### 3.1.1 集成点

**文件位置**: `components/projects/`, `pages/api/projects/`

**集成方式**:
```typescript
// 在项目创建成功后
const toast = useToast()
const response = await apiRequest('/api/projects', {
  method: 'POST',
  body: JSON.stringify(projectData)
})

if (response.success) {
  toast.projectCreated(projectData.name)
  // 可选：如果分配了工人
  if (projectData.assignedWorker) {
    setTimeout(() => {
      toast.workerReassigned(projectData.name, '', projectData.assignedWorker)
    }, 1000)
  }
}
```

**实际应用场景**:
- 项目新建完成 → `project-created` Toast
- 项目信息编辑保存 → `project-updated` Toast  
- 项目删除确认 → `project-deleted` Toast
- 项目移动到过往库 → `project-archived` Toast
- 材料状态变化触发项目状态自动更新 → `project-status-auto` Toast

#### 3.1.2 消息示例

```typescript
// 示例消息（无emoji，纯文字）
projectCreated: `项目 "${projectName}" 创建成功`
projectStatusAuto: `项目"${projectName}"状态自动更新为${newStatus}，原因：${reason}`
workerReassigned: `项目"${projectName}"已重新分配：${fromWorker} → ${toWorker}`
```

### 3.2 材料管理模块实现（核心功能）

#### 3.2.1 四状态循环集成

**文件位置**: `components/materials/MaterialInventoryManagerNew.tsx`, `stores/materialStore.ts`

**状态转换集成**:
```typescript
// 材料状态更新函数中添加Toast
const updateMaterialStatus = async (materialId: number, newStatus: MaterialStatus) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest(`/api/materials/${materialId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    })
    
    if (response.success) {
      const material = response.data
      
      // 根据状态转换显示对应Toast
      switch (newStatus) {
        case 'pending':
          toast.materialAllocated(material.thickness + 'mm碳板', material.projectName, material.quantity)
          break
        case 'in_progress':
          toast.materialStarted(material.thickness + 'mm碳板', material.workerName)
          break
        case 'completed':
          toast.materialCompleted(material.thickness + 'mm碳板', material.workerName)
          break
        case 'empty':
          toast.materialRecycled(material.thickness + 'mm碳板')
          break
      }
    }
  } catch (error) {
    toast.addToast({
      type: 'error',
      message: '材料状态更新失败，请重试'
    })
  }
}
```

#### 3.2.2 库存管理集成

**文件位置**: `components/materials/AddMaterialModal.tsx`

```typescript
// 添加材料库存时
const handleAddStock = async (stockData) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest('/api/worker-materials', {
      method: 'POST',
      body: JSON.stringify(stockData)
    })
    
    if (response.success) {
      toast.stockAdded(stockData.workerName, stockData.materialType, stockData.quantity)
      
      // 检查尺寸信息
      if (stockData.dimensions) {
        setTimeout(() => {
          toast.dimensionAdded(stockData.materialType, stockData.dimensions, stockData.quantity)
        }, 500)
      }
    }
  } catch (error) {
    toast.addToast({
      type: 'error',
      message: '库存添加失败：' + error.message
    })
  }
}

// 材料分配时检查库存
const handleMaterialAllocation = async (allocationData) => {
  const toast = useToast()
  
  // 库存不足检查
  if (allocationData.required > allocationData.available) {
    toast.stockWarning(
      allocationData.workerName,
      allocationData.materialType,
      allocationData.available,
      allocationData.required
    )
    return false
  }
  
  // 执行分配...
  toast.materialAllocated(allocationData.materialType, allocationData.projectName, allocationData.required)
}
```

#### 3.2.3 95/5策略监控集成

**实现位置**: `utils/materialStatusManager.ts` 或材料分配逻辑中

```typescript
// 材料使用比例检查函数
const checkMaterialStrategy = (materials: Material[]) => {
  const toast = useToast()
  
  const totalMaterials = materials.length
  const carbonMaterials = materials.filter(m => m.type === 'carbon').length
  const carbonRatio = (carbonMaterials / totalMaterials) * 100
  
  // 95/5策略检查
  if (carbonRatio < 90) {
    toast.strategyDeviation(Math.round(carbonRatio), 95)
  } else if (carbonRatio >= 95 && carbonRatio <= 100) {
    // 回归正常范围时提示（避免频繁提示）
    const lastCheck = localStorage.getItem('lastStrategyCheck')
    const now = Date.now()
    
    if (!lastCheck || (now - parseInt(lastCheck)) > 300000) { // 5分钟间隔
      toast.strategyBalanced()
      localStorage.setItem('lastStrategyCheck', now.toString())
    }
  }
}

// 在材料状态变更后调用检查
window.addEventListener('materials-updated', () => {
  const materials = materialStore.getState().materials
  checkMaterialStrategy(materials)
})
```

### 3.3 图纸管理模块实现

#### 3.3.1 文件上传集成

**文件位置**: `components/drawings/DrawingUpload.tsx`

```typescript
// 文件上传进度处理
const handleFileUpload = async (file: File) => {
  const toast = useToast()
  
  // 开始上传提示
  const uploadToastId = toast.fileUploading(file.name, 0)
  
  try {
    // 创建上传请求，监听进度
    const formData = new FormData()
    formData.append('file', file)
    
    const xhr = new XMLHttpRequest()
    
    // 进度监听
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100)
        toast.updateToast(uploadToastId, {
          message: `正在上传图纸"${file.name}" (${progress}%)`,
          progress
        })
      }
    })
    
    // 上传完成
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        
        // 移除进度Toast，显示成功Toast
        toast.removeToast(uploadToastId)
        toast.fileUploaded(file.name)
        
        // DXF解析完成提示
        if (file.name.toLowerCase().endsWith('.dxf')) {
          setTimeout(() => {
            toast.dxfParsed(file.name)
          }, 1000)
        }
        
        // 版本管理提示
        if (response.versionInfo?.isNewVersion) {
          setTimeout(() => {
            toast.versionUpdated(file.name, response.versionInfo.version)
          }, 2000)
        }
        
        // 版本冲突提示
        if (response.versionInfo?.hasConflict) {
          setTimeout(() => {
            toast.versionConflict(file.name)
          }, 1500)
        }
      } else {
        toast.removeToast(uploadToastId)
        toast.addToast({
          type: 'upload-error',
          message: `图纸上传失败：${xhr.statusText}`
        })
      }
    })
    
    // 发送请求
    xhr.open('POST', '/api/drawings/upload')
    xhr.send(formData)
    
  } catch (error) {
    toast.removeToast(uploadToastId)
    toast.addToast({
      type: 'upload-error',
      message: `图纸上传失败：${error.message}`
    })
  }
}

// 图纸关联项目
const handleDrawingLink = async (drawingId: number, projectId: number) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest(`/api/drawings/${drawingId}/link`, {
      method: 'POST',
      body: JSON.stringify({ projectId })
    })
    
    if (response.success) {
      toast.drawingLinked(response.drawingName, response.projectName)
    }
  } catch (error) {
    toast.addToast({
      type: 'error',
      message: '图纸关联失败：' + error.message
    })
  }
}

// 常用零件标记
const handleCommonPartTag = async (drawingId: number, isCommon: boolean) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest(`/api/drawings/${drawingId}/common`, {
      method: 'PUT',
      body: JSON.stringify({ isCommonPart: isCommon })
    })
    
    if (response.success && isCommon) {
      toast.commonPartTagged(response.fileName)
    }
  } catch (error) {
    // 错误处理
  }
}
```

### 3.4 工人管理模块实现

#### 3.4.1 工人信息管理集成

**文件位置**: `components/workers/`, `pages/api/workers/`

```typescript
// 工人信息更新
const handleWorkerUpdate = async (workerId: number, workerData: any) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest(`/api/workers/${workerId}`, {
      method: 'PUT',
      body: JSON.stringify(workerData)
    })
    
    if (response.success) {
      toast.workerUpdated(workerData.name, workerData.department)
    }
  } catch (error) {
    toast.addToast({
      type: 'error',
      message: '工人信息更新失败'
    })
  }
}

// 新工人添加
const handleAddWorker = async (workerData: any) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest('/api/workers', {
      method: 'POST',
      body: JSON.stringify(workerData)
    })
    
    if (response.success) {
      toast.workerAdded(workerData.name, workerData.department)
    }
  } catch (error) {
    toast.addToast({
      type: 'error',
      message: '工人添加失败'
    })
  }
}
```

#### 3.4.2 工作负载监控集成

```typescript
// 工人负载检查函数
const checkWorkerWorkload = (workers: Worker[], projects: Project[]) => {
  const toast = useToast()
  
  workers.forEach(worker => {
    const assignedProjects = projects.filter(p => p.assignedWorkerId === worker.id && p.status !== 'completed')
    
    // 负载过重检查
    if (assignedProjects.length > 5) {
      toast.workerOverloaded(worker.name, assignedProjects.length)
    }
    
    // 空闲工人检查
    if (assignedProjects.length === 0) {
      toast.workerAvailable(worker.name)
    }
  })
}

// 在项目分配变更时调用
window.addEventListener('project-assignment-changed', () => {
  const workers = workerStore.getState().workers
  const projects = projectStore.getState().projects
  checkWorkerWorkload(workers, projects)
})
```

### 3.5 实时协作模块实现（SSE集成）

#### 3.5.1 SSE事件Toast映射

**文件位置**: `utils/sseManager.ts`, `stores/notificationStore.ts`

```typescript
// SSE事件到Toast的映射关系
const sseToastMapping = {
  'project-created': (data: any) => {
    const toast = useToast()
    toast.collaborationNotify(data.userName, `创建了新项目 "${data.project.name}"`)
  },
  
  'material-status-changed': (data: any) => {
    const toast = useToast()
    toast.syncUpdated(data.userName, '材料状态', `${data.materialType}→${data.newStatus}`)
  },
  
  'project-deleted': (data: any) => {
    const toast = useToast()
    toast.addToast({
      type: 'collaboration-alert',
      message: `${data.userName}删除了项目 "${data.projectName}"`,
      priority: 'high'
    })
  },
  
  'worker-assignment-changed': (data: any) => {
    const toast = useToast()
    toast.addToast({
      type: 'assignment-changed',
      message: `${data.userName}将项目"${data.projectName}"重新分配给${data.newWorkerName}`,
      showTime: true
    })
  }
}

// 在SSE连接中处理事件
sseManager.addEventListener('message', (event) => {
  const data = JSON.parse(event.data)
  
  if (sseToastMapping[data.type]) {
    sseToastMapping[data.type](data)
  }
})

// 连接状态Toast
sseManager.addEventListener('open', () => {
  const toast = useToast()
  toast.connectionRestored()
})

sseManager.addEventListener('error', () => {
  const toast = useToast()
  toast.connectionLost()
})
```

### 3.6 智能辅助功能实现

#### 3.6.1 基于历史数据的智能提示

```typescript
// 相似项目检测
const detectSimilarProjects = async (newProject: Project) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest('/api/projects/similar', {
      method: 'POST',
      body: JSON.stringify({ projectName: newProject.name })
    })
    
    if (response.similarProjects?.length > 0) {
      toast.smartSuggestion(
        `检测到类似项目，是否复制材料配置？`
      )
    }
  } catch (error) {
    // 静默处理
  }
}

// 材料使用模式分析
const analyzeMaterialPattern = (projectType: string) => {
  const toast = useToast()
  
  // 基于历史数据分析（模拟）
  const patterns = {
    '激光切割外壳': '该项目类型通常需要2mm和3mm碳板',
    '精密零件': '精密加工项目多使用1mm-2mm厚度材料',
    '大型结构': '结构项目建议使用4mm以上厚度材料'
  }
  
  const pattern = patterns[projectType]
  if (pattern) {
    toast.patternInsight(pattern, '历史数据分析')
  }
}

// 效率分析报告
const generateEfficiencyReport = () => {
  const toast = useToast()
  
  // 计算本周材料利用率（模拟）
  const thisWeekRatio = 92
  const lastWeekRatio = 89
  const improvement = thisWeekRatio - lastWeekRatio
  
  if (improvement > 0) {
    toast.efficiencyInsight(`本周材料利用率${thisWeekRatio}%，比上周提升${improvement}%`)
  }
}
```

### 3.7 批量操作集成

#### 3.7.1 批量状态更新

```typescript
// 批量材料状态更新
const handleBatchStatusUpdate = async (materialIds: number[], newStatus: string) => {
  const toast = useToast()
  
  try {
    const response = await apiRequest('/api/materials/batch/status', {
      method: 'PUT',
      body: JSON.stringify({
        materialIds,
        status: newStatus
      })
    })
    
    if (response.success) {
      const successCount = response.successCount
      const totalCount = materialIds.length
      
      if (successCount === totalCount) {
        toast.batchOperation('批量状态更新', successCount, 'success')
      } else if (successCount > 0) {
        toast.batchOperation('批量状态更新', totalCount, 'partial')
      } else {
        toast.batchOperation('批量状态更新', totalCount, 'failed')
      }
    }
  } catch (error) {
    toast.batchOperation('批量状态更新', materialIds.length, 'failed')
  }
}
```

---

## 四、集成步骤

### 4.1 第一阶段：核心组件部署（第1-2天）

#### 4.1.1 Toast组件部署

1. **确认Toast.tsx组件**
   - 文件路径: `/components/ui/Toast.tsx`
   - 确认所有25+业务类型已定义
   - 确认所有emoji已清除

2. **ToastContainer部署**
   - 在主布局文件中集成ToastContainer
   - 位置: `components/layout/MainLayout.tsx` 或 `app/layout.tsx`
   
   ```typescript
   import { ToastContainer } from '@/components/ui/Toast'
   
   export default function Layout({ children }) {
     return (
       <>
         {children}
         <ToastContainer position="top-right" />
       </>
     )
   }
   ```

#### 4.1.2 基础集成测试

创建Toast测试页面：
```typescript
// app/toast-test/page.tsx
'use client'
import { useToast } from '@/components/ui/Toast'

export default function ToastTestPage() {
  const toast = useToast()
  
  return (
    <div className="p-8 space-y-4">
      <h1>Toast测试页面</h1>
      
      <button 
        onClick={() => toast.projectCreated('测试项目')}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        测试项目创建Toast
      </button>
      
      <button 
        onClick={() => toast.materialCompleted('2mm碳板', '张师傅')}
        className="px-4 py-2 bg-green-500 text-white rounded"
      >
        测试材料完成Toast
      </button>
      
      {/* 更多测试按钮... */}
    </div>
  )
}
```

### 4.2 第二阶段：业务模块集成（第3-7天）

#### 4.2.1 项目管理模块集成（第3天）

**集成文件**:
- `components/projects/ProjectCard.tsx`
- `components/projects/ProjectDetailModern.tsx`  
- `pages/api/projects/index.ts`

**集成代码示例**:
```typescript
// 在 ProjectCard.tsx 中
import { useToast } from '@/components/ui/Toast'

const ProjectCard = ({ project }) => {
  const toast = useToast()
  
  const handleDelete = async () => {
    try {
      await apiRequest(`/api/projects/${project.id}`, { method: 'DELETE' })
      toast.projectDeleted(project.name)
    } catch (error) {
      toast.addToast({ type: 'error', message: '项目删除失败' })
    }
  }
  
  // 其他处理函数...
}
```

#### 4.2.2 材料管理模块集成（第4-5天）

**重点集成文件**:
- `components/materials/MaterialInventoryManagerNew.tsx`
- `components/materials/AddMaterialModal.tsx`
- `stores/materialStore.ts`

**四状态循环集成**:
```typescript
// 在 materialStore.ts 中
import { useToast } from '@/components/ui/Toast'

const useMaterialStore = create((set, get) => ({
  updateMaterialStatus: async (materialId: number, newStatus: MaterialStatus) => {
    const toast = useToast()
    
    try {
      const response = await apiRequest(`/api/materials/${materialId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.success) {
        // 更新本地状态
        set(state => ({
          materials: state.materials.map(m => 
            m.id === materialId ? { ...m, status: newStatus } : m
          )
        }))
        
        // 显示Toast
        const material = response.data
        switch (newStatus) {
          case 'pending':
            toast.materialAllocated(material.thickness + 'mm碳板', material.projectName, 1)
            break
          case 'in_progress':
            toast.materialStarted(material.thickness + 'mm碳板', material.workerName)
            break
          case 'completed':
            toast.materialCompleted(material.thickness + 'mm碳板', material.workerName)
            break
          case 'empty':
            toast.materialRecycled(material.thickness + 'mm碳板')
            break
        }
        
        // 触发全局事件
        window.dispatchEvent(new CustomEvent('materials-updated'))
      }
    } catch (error) {
      toast.addToast({ type: 'error', message: '状态更新失败' })
    }
  }
}))
```

#### 4.2.3 图纸管理模块集成（第6天）

**集成文件**:
- `components/drawings/DrawingUpload.tsx`
- `components/drawings/DrawingLibrary.tsx`

#### 4.2.4 工人管理模块集成（第7天）

**集成文件**:
- `components/workers/` (如果存在)
- 工人相关API调用点

### 4.3 第三阶段：高级功能集成（第8-10天）

#### 4.3.1 SSE事件Toast映射（第8天）

在 `utils/sseManager.ts` 中添加Toast集成：

```typescript
import { useToast } from '@/components/ui/Toast'

class SSEManager {
  private toast = useToast() // 注意：实际需要在React组件中使用
  
  private handleSSEMessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data)
    
    switch (data.type) {
      case 'project-created':
        this.toast.collaborationNotify(data.userName, `创建了新项目 "${data.project.name}"`)
        break
        
      case 'material-status-changed':
        this.toast.syncUpdated(data.userName, '材料状态', `${data.materialType}→${data.newStatus}`)
        break
        
      // 其他事件处理...
    }
  }
}
```

#### 4.3.2 智能提示功能集成（第9天）

创建智能分析工具：

```typescript
// utils/intelligentToast.ts
import { useToast } from '@/components/ui/Toast'

export class IntelligentToastManager {
  private toast = useToast()
  
  // 检查相似项目
  async checkSimilarProjects(newProject: Project) {
    try {
      const response = await apiRequest('/api/projects/analyze', {
        method: 'POST',
        body: JSON.stringify({ projectName: newProject.name })
      })
      
      if (response.similarProjects?.length > 0) {
        this.toast.smartSuggestion('检测到类似项目，是否复制材料配置？')
      }
    } catch (error) {
      // 静默处理
    }
  }
  
  // 材料使用模式分析
  analyzeUsagePattern(materials: Material[]) {
    const carbonRatio = this.calculateCarbonRatio(materials)
    
    if (carbonRatio < 90) {
      this.toast.strategyDeviation(carbonRatio, 95)
    }
  }
  
  private calculateCarbonRatio(materials: Material[]): number {
    const totalMaterials = materials.length
    const carbonMaterials = materials.filter(m => m.materialType === 'carbon').length
    return (carbonMaterials / totalMaterials) * 100
  }
}
```

#### 4.3.3 批量操作集成（第10天）

在所有支持批量操作的组件中集成相应Toast提示。

### 4.4 第四阶段：测试和优化（第11-12天）

#### 4.4.1 功能测试清单

**基础功能测试**:
- [ ] Toast组件正常显示和关闭
- [ ] 右上角位置正确
- [ ] 音频反馈正常播放
- [ ] 无emoji显示，纯文字提示

**业务场景测试**:
- [ ] 项目创建/更新/删除Toast
- [ ] 材料四状态循环Toast
- [ ] 图纸上传进度Toast
- [ ] 工人管理相关Toast
- [ ] SSE事件Toast触发
- [ ] 智能提示Toast

**性能测试**:
- [ ] 大量Toast并发显示性能
- [ ] 内存泄漏检查
- [ ] 音频文件加载性能

#### 4.4.2 用户体验优化

**Toast显示优化**:
- 避免相同类型Toast重复显示
- 优先级高的Toast覆盖低优先级
- Toast数量超过5个时自动清理旧的

**交互体验优化**:
- Toast点击跳转到相关页面（如适用）
- 长消息的展开/收缩功能
- 批量清除功能

---

## 五、配置和维护

### 5.1 配置参数

#### 5.1.1 默认配置

```typescript
// Toast默认配置
const defaultToastConfig = {
  position: 'top-right',           // 显示位置
  duration: 4000,                  // 默认显示时间(毫秒)
  maxToasts: 5,                    // 最大同时显示数量
  enableAudio: true,               // 启用音频反馈
  enableDesktopNotification: true, // 启用桌面通知
  autoCloseDelay: 4000,           // 自动关闭延迟
  priority: 'normal'               // 默认优先级
}
```

#### 5.1.2 用户自定义配置

```typescript
// 用户配置存储 (localStorage)
const userToastPreferences = {
  enableAudio: true,               // 用户可关闭音频
  enableSmartSuggestions: true,    // 用户可关闭智能提示
  showTimestamp: false,            // 显示时间戳偏好
  toastDuration: 4000,            // 个人偏好显示时长
  disabledTypes: []               // 用户禁用的Toast类型
}
```

### 5.2 监控和日志

#### 5.2.1 Toast使用统计

```typescript
// Toast使用统计收集
const toastAnalytics = {
  logToastDisplay: (type: string, message: string) => {
    // 记录Toast显示统计
    console.log(`Toast显示: ${type} - ${message}`)
  },
  
  logUserInteraction: (toastId: string, action: 'click' | 'close' | 'timeout') => {
    // 记录用户交互
    console.log(`Toast交互: ${toastId} - ${action}`)
  }
}
```

#### 5.2.2 错误监控

```typescript
// Toast错误监控
const toastErrorHandler = {
  handleAudioError: (error: Error) => {
    console.warn('Toast音频播放失败:', error)
    // 静默处理，不影响Toast显示
  },
  
  handleRenderError: (error: Error) => {
    console.error('Toast渲染错误:', error)
    // 可以发送错误报告
  }
}
```

### 5.3 性能优化

#### 5.3.1 Toast渲染优化

```typescript
// Toast组件优化措施
const ToastOptimized = React.memo(({ toast, onRemove }) => {
  // 使用React.memo避免不必要重渲染
  return <Toast {...toast} onRemove={onRemove} />
})

// 虚拟滚动（如果Toast数量很大）
const VirtualToastContainer = () => {
  const visibleToasts = toasts.slice(0, 5) // 只渲染可见的Toast
  return (
    <div>
      {visibleToasts.map(toast => 
        <ToastOptimized key={toast.id} toast={toast} />
      )}
    </div>
  )
}
```

#### 5.3.2 内存管理

```typescript
// Toast内存清理
const toastMemoryManager = {
  clearExpiredToasts: () => {
    const now = Date.now()
    toasts = toasts.filter(toast => 
      !toast.persistent && (now - toast.createdAt) < 300000 // 5分钟
    )
  },
  
  limitToastCount: () => {
    if (toasts.length > 20) {
      toasts = toasts.slice(-10) // 只保留最新10个
    }
  }
}

// 定期清理
setInterval(() => {
  toastMemoryManager.clearExpiredToasts()
  toastMemoryManager.limitToastCount()
}, 60000) // 每分钟清理一次
```

---

## 六、验收标准

### 6.1 功能验收

#### 6.1.1 基础功能要求

- [x] Toast组件能够正常显示和关闭
- [x] 支持右上角定位
- [x] 支持25+种业务场景类型
- [x] 所有消息使用纯文字，无emoji
- [x] 音频反馈正常工作
- [x] 响应式设计适配不同屏幕

#### 6.1.2 业务集成要求

- [ ] 项目管理所有CRUD操作有Toast反馈
- [ ] 材料四状态循环每个转换有Toast提示
- [ ] 图纸上传过程有进度和结果Toast
- [ ] 工人管理操作有相应Toast
- [ ] SSE事件能够触发对应Toast
- [ ] 智能提示功能正常工作

#### 6.1.3 用户体验要求

- [ ] Toast不干扰主要操作界面
- [ ] 消息内容清晰易懂
- [ ] 音效适中，不突兀
- [ ] 批量Toast不会造成界面混乱
- [ ] 网络异常有相应提示

### 6.2 性能验收

#### 6.2.1 性能指标

- Toast渲染时间 < 100ms
- 音频播放延迟 < 200ms
- 内存占用增长 < 10MB（长时间使用）
- CPU占用增长 < 5%（Toast密集显示时）

#### 6.2.2 稳定性指标

- 连续运行24小时无内存泄漏
- 并发显示20个Toast无崩溃
- 网络断开重连后Toast正常工作
- 不同浏览器兼容性良好

### 6.3 代码质量验收

#### 6.3.1 代码规范

- TypeScript类型定义完整
- 组件代码结构清晰
- 错误处理完善
- 注释文档充分

#### 6.3.2 可维护性

- 新增Toast类型容易扩展
- 业务逻辑与UI逻辑分离
- 配置化程度高
- 测试覆盖率 > 80%

---

## 七、部署和上线

### 7.1 部署前检查

#### 7.1.1 代码检查清单

- [ ] 所有emoji已清除
- [ ] TypeScript编译无错误
- [ ] ESLint检查通过
- [ ] 所有Toast类型已测试
- [ ] 音频文件正确加载
- [ ] 生产环境配置正确

#### 7.1.2 兼容性检查

- [ ] Chrome 90+
- [ ] Firefox 85+
- [ ] Safari 14+
- [ ] Edge 90+
- [ ] 移动端Safari/Chrome

### 7.2 上线步骤

#### 7.2.1 分阶段上线

**阶段1**: 内部测试环境部署
- 部署所有Toast组件
- 进行全面功能测试
- 收集内部反馈

**阶段2**: 生产环境灰度发布
- 50%用户启用新Toast系统
- 监控性能和错误率
- 收集用户反馈

**阶段3**: 全量上线
- 100%用户启用
- 持续监控和优化

#### 7.2.2 回滚方案

- 保留原有NotificationContainer作为备份
- 通过feature flag快速切换
- 数据库回滚脚本准备

### 7.3 上线后维护

#### 7.3.1 监控指标

- Toast显示成功率
- 音频播放成功率
- 用户交互率
- 错误率和崩溃率

#### 7.3.2 持续优化

- 根据用户反馈调整消息内容
- 优化Toast显示时机
- 增加新的智能提示场景
- 性能持续优化

---

## 八、附录

### 8.1 完整Toast类型清单

#### 8.1.1 基础类型
- `success` - 通用成功提示
- `error` - 通用错误提示  
- `warning` - 通用警告提示
- `info` - 通用信息提示

#### 8.1.2 项目管理类型
- `project-created` - 项目创建成功
- `project-updated` - 项目信息更新
- `project-deleted` - 项目删除确认
- `project-status-auto` - 状态自动更新
- `project-archived` - 移动到过往项目
- `worker-reassigned` - 工人重新分配

#### 8.1.3 材料管理类型
- `material-allocated` - 材料分配
- `material-started` - 开始加工
- `material-completed` - 加工完成
- `material-recycled` - 材料回收
- `stock-added` - 库存增加
- `stock-warning` - 库存不足警告
- `dimension-added` - 尺寸规格添加
- `material-transferred` - 材料调拨
- `strategy-deviation` - 95/5策略偏离
- `strategy-balanced` - 策略回归正常

#### 8.1.4 图纸管理类型
- `file-uploading` - 文件上传进度
- `file-uploaded` - 上传成功
- `dxf-parsed` - DXF解析完成
- `common-part-tagged` - 常用零件标记
- `upload-error` - 上传失败
- `version-updated` - 版本更新
- `version-conflict` - 版本冲突
- `drawing-linked` - 图纸关联项目

#### 8.1.5 工人管理类型
- `worker-updated` - 工人信息更新
- `worker-added` - 新工人加入
- `worker-removed` - 工人移除
- `worker-overloaded` - 工作负载过重
- `worker-available` - 工人空闲可用

#### 8.1.6 实时协作类型
- `collaboration-notify` - 协作通知
- `sync-updated` - 同步更新
- `sync-completed` - 数据同步完成
- `sync-error` - 同步失败
- `connection-lost` - 连接中断
- `connection-restored` - 连接恢复

#### 8.1.7 智能辅助类型
- `smart-suggestion` - 智能建议
- `pattern-insight` - 模式洞察
- `efficiency-insight` - 效率分析
- `workflow-optimization` - 工作流优化
- `bottleneck-detected` - 瓶颈识别

#### 8.1.8 批量操作类型
- `batch-operation` - 批量处理反馈

#### 8.1.9 特殊类型
- `wancheng` - 项目完成庆祝

### 8.2 音效文件清单

#### 8.2.1 音效文件路径
```
public/audio/
├── success.wav     - 成功音效
├── error.wav       - 错误音效  
├── warning.wav     - 警告音效
├── info.wav        - 信息音效
└── wancheng.wav    - 完成庆祝音效
```

#### 8.2.2 音效使用规则
- `wancheng.wav`: 项目完成、重要材料加工完成
- `success.wav`: 一般成功操作
- `warning.wav`: 库存不足、策略偏离等警告
- `error.wav`: 操作失败、连接中断等错误
- `info.wav`: 一般信息提示

### 8.3 常见问题解答

#### 8.3.1 Q: Toast不显示怎么办？
A: 检查以下步骤：
1. 确认ToastContainer已在布局中引入
2. 检查useToast hook是否正确调用
3. 查看浏览器控制台是否有错误
4. 确认z-index层级没有被遮挡

#### 8.3.2 Q: 音效不播放怎么办？
A: 检查以下步骤：
1. 确认音频文件路径正确
2. 检查浏览器音频权限
3. 确认audioManager正确初始化
4. 检查音频文件格式兼容性

#### 8.3.3 Q: Toast显示太多造成界面混乱？
A: 解决方案：
1. 调整maxToasts参数限制显示数量
2. 使用优先级控制重要Toast显示
3. 实现Toast合并机制
4. 增加一键清除功能

#### 8.3.4 Q: 如何添加新的Toast类型？
A: 步骤：
1. 在ToastProps接口中添加新类型
2. 在getToastIcon函数中添加图标映射
3. 在getToastStyles函数中添加样式映射
4. 在useToast hook中添加对应方法
5. 更新本文档的类型清单

---

**文档状态**: 已完成  
**最后更新**: 2025-01-13  
**下次审核**: 2025-02-13
# Toast智能通知系统 - 完整使用文档

## 概述

Toast智能通知系统是为激光切割生产管理系统设计的全功能通知解决方案，提供业务感知的智能提示、批量操作支持、实时事件处理和完整的可访问性支持。

## 核心特性

### 🚀 核心功能
- **业务模块集成**: 项目、材料、图纸、工人管理模块的原生Toast支持
- **四状态循环**: 完整支持材料状态管理（empty→pending→in_progress→completed→empty）
- **批量操作**: 专门的批量操作Toast通知和进度追踪
- **智能提示**: 基于业务数据分析的智能建议系统
- **实时事件**: SSE事件自动转换为Toast通知

### 🎨 用户体验
- **动画效果**: 多种预设动画（slide、fade、bounce、slideUp）
- **响应式设计**: 完美适配桌面、平板、移动端
- **主题支持**: 支持浅色/深色主题和高对比度模式
- **可访问性**: WCAG 2.1 AA级无障碍访问支持

### ⚡ 性能优化
- **事件驱动**: 高效的事件系统，支持非React组件调用
- **内存优化**: Toast池技术和智能队列管理
- **动画性能**: 优化的Framer Motion动画和性能监控

## 快速开始

### 1. 基础用法

```typescript
import { useToast } from '@/components/ui/Toast'

function MyComponent() {
  const toast = useToast()
  
  // 基础Toast
  const showBasicToast = () => {
    toast.addToast({
      type: 'success',
      message: '操作成功完成',
      duration: 3000
    })
  }
  
  // 业务专用Toast
  const showProjectToast = () => {
    toast.projectCreated('新项目A')
  }
  
  return (
    <button onClick={showBasicToast}>
      显示Toast
    </button>
  )
}
```

### 2. 业务模块集成

#### 项目管理Toast
```typescript
import { projectToastHelper } from '@/utils/projectToastHelper'

// 项目创建
projectToastHelper.projectCreated('激光切割项目A', '张师傅')

// 项目状态变更
projectToastHelper.projectStatusChanged('项目A', '待处理', '进行中', '工人已开始工作')

// 工人重新分配
projectToastHelper.workerReassigned('项目A', '张师傅', '李师傅')
```

#### 材料管理Toast（四状态循环）
```typescript
import { materialToastHelper } from '@/utils/materialToastHelper'

// 材料分配（empty → pending）
materialToastHelper.materialAllocated('3mm碳板', '项目A', 5)

// 开始加工（pending → in_progress）
materialToastHelper.materialStarted('3mm碳板', '李师傅')

// 完成加工（in_progress → completed）
materialToastHelper.materialCompleted('3mm碳板', '李师傅')

// 回收利用（completed → empty）
materialToastHelper.materialRecycled('3mm碳板')
```

#### 图纸管理Toast
```typescript
import { drawingToastHelper } from '@/utils/drawingToastHelper'

// 图纸上传
drawingToastHelper.drawingUploaded('设计图A.dxf', '项目A')

// DXF解析
drawingToastHelper.dxfParsed('设计图A.dxf', '解析成功，发现5个切割路径')

// 批量上传完成
drawingToastHelper.batchUploadComplete(8, 10)
```

#### 工人管理Toast
```typescript
import { workerToastHelper } from '@/utils/workerToastHelper'

// 新增工人
workerToastHelper.workerAdded('新员工A', '切割部')

// 工人负载警告
workerToastHelper.workerOverloaded('李师傅', 8)

// 工作负载平衡
workerToastHelper.workloadBalanced()
```

### 3. 批量操作支持

#### 使用BatchOperationTracker
```typescript
import { BatchOperationTracker } from '@/utils/batchOperationToastHelper'

async function batchUpdateProjects(projectIds: number[]) {
  const tracker = new BatchOperationTracker(
    '批量更新项目状态',
    projectIds.length,
    'project-batch'
  )
  
  for (const projectId of projectIds) {
    try {
      await updateProject(projectId)
      tracker.updateProgress(`项目${projectId}`)
    } catch (error) {
      tracker.addError(`项目${projectId}更新失败: ${error}`)
    }
  }
  
  tracker.complete()
}
```

#### 直接使用批量Toast
```typescript
import { batchOperationToastHelper } from '@/utils/batchOperationToastHelper'

// 项目批量操作
batchOperationToastHelper.projectBatchStatusChange(8, 10, '已完成')

// 材料批量转移
batchOperationToastHelper.materialBatchTransfer(5, 5, '张师傅', '李师傅')

// 工人批量创建
batchOperationToastHelper.workerBatchCreate(3, 3, '装配部')
```

### 4. 智能提示系统

#### 启用智能提示
```typescript
import { useSmartSuggestions, smartSuggestionEngine } from '@/utils/smartSuggestionEngine'

function App() {
  // 自动启动智能提示
  const smartSuggestions = useSmartSuggestions({ autoStart: true })
  
  // 更新业务指标
  const updateMetrics = () => {
    smartSuggestionEngine.updateMetrics({
      projectCompletionRate: 68.5,
      averageProjectDuration: 32,
      carbonMaterialRatio: 88, // 偏离95/5策略
      materialUtilizationRate: 76
    })
  }
  
  return <div>...</div>
}
```

### 5. SSE事件集成

Toast系统会自动监听SSE事件并转换为相应的Toast通知：

```typescript
// 在MainLayout中自动启用
import { useSSEToastMapping } from '@/utils/sseToastMapper'

const sseToastMapping = useSSEToastMapping({
  autoStart: true,
  projectEvents: true,
  materialEvents: true,
  drawingEvents: true,
  workerEvents: true,
})
```

## Toast类型和配置

### 基础Toast类型
- `success` - 成功操作
- `error` - 错误警告  
- `warning` - 警告提示
- `info` - 信息通知

### 业务Toast类型
```typescript
// 项目管理
'project-created' | 'project-updated' | 'project-deleted' | 'project-status-auto' | 'project-archived' | 'worker-reassigned'

// 材料管理（四状态循环）
'material-allocated' | 'material-started' | 'material-completed' | 'material-recycled' | 
'stock-added' | 'stock-warning' | 'dimension-added' | 'material-transferred' |
'strategy-deviation' | 'strategy-balanced'

// 图纸管理
'file-uploading' | 'file-uploaded' | 'dxf-parsed' | 'common-part-tagged' | 'upload-error' |
'version-updated' | 'version-conflict' | 'drawing-linked'

// 工人管理
'worker-added' | 'worker-updated' | 'worker-removed' | 'worker-overloaded' | 'worker-available' | 'workload-balanced'

// 智能辅助
'smart-suggestion' | 'pattern-insight' | 'skill-match' | 'timeline-insight' | 'efficiency-insight' | 'workflow-optimization'

// 批量操作
'batch-operation'
```

### Toast配置选项
```typescript
interface ToastProps {
  message: string                    // 消息内容
  type?: ToastType                   // Toast类型
  duration?: number                  // 显示时长（毫秒）
  position?: Position                // 显示位置
  priority?: 'low' | 'normal' | 'high' | 'urgent'  // 优先级
  persistent?: boolean               // 是否持久显示
  expandable?: boolean               // 是否可展开
  details?: string                   // 详细信息
  actions?: ToastAction[]            // 操作按钮
  showTime?: boolean                 // 显示时间戳
  variant?: 'filled' | 'outline' | 'glass'  // 视觉样式
  size?: 'sm' | 'md' | 'lg'         // 尺寸
}
```

## 高级特性

### 1. 动画自定义
```typescript
import { TOAST_ANIMATIONS, getAnimationConfig } from '@/utils/toastAnimationOptimizer'

// 使用预设动画
const slideAnimation = getAnimationConfig('slide', 'enter')

// 自定义动画配置
const customAnimation = getAnimationConfig('bounce', 'enter', {
  duration: 0.5,
  stiffness: 300,
  damping: 20
})
```

### 2. 可访问性配置
```typescript
import { useToastAccessibility } from '@/utils/toastAccessibility'

function AccessibleToast({ id, message }) {
  const {
    elementRef,
    announceToScreenReader,
    getAccessibilityProps
  } = useToastAccessibility(id, {
    ariaLive: 'assertive',
    enableKeyboardNavigation: true,
    respectReducedMotion: true
  })
  
  useEffect(() => {
    announceToScreenReader(message, 'info')
  }, [message])
  
  return (
    <div {...getAccessibilityProps()}>
      {message}
    </div>
  )
}
```

### 3. 性能监控
```typescript
import { useToastPerformanceMonitor } from '@/utils/toastAnimationOptimizer'

function PerformanceMonitor() {
  const metrics = useToastPerformanceMonitor()
  
  return (
    <div>
      <p>活跃Toast: {metrics.activeToasts}</p>
      <p>动画帧率: {metrics.animationFPS.toFixed(1)} FPS</p>
      <p>内存使用: {metrics.memoryUsage}</p>
    </div>
  )
}
```

## 最佳实践

### 1. 消息内容指南
- **简洁明确**: 消息长度控制在50字以内
- **业务语言**: 使用用户熟悉的业务术语
- **操作导向**: 明确告知用户发生了什么和下一步怎么做

```typescript
// ✅ 好的例子
toast.addToast({
  type: 'success',
  message: '3mm碳板已分配给项目"激光切割A"',
  actions: [{ label: '查看详情', onClick: () => openProject() }]
})

// ❌ 避免的例子
toast.addToast({
  type: 'info',
  message: '操作执行成功，数据已更新到数据库中，请注意查看相关变化'
})
```

### 2. 优先级使用
- **urgent**: 系统错误、安全警告、数据丢失风险
- **high**: 操作失败、重要状态变更、瓶颈警告
- **normal**: 成功操作、一般信息、进度更新
- **low**: 提示信息、优化建议、背景任务

### 3. 持续时间建议
```typescript
const durationGuidelines = {
  success: 3000,      // 成功操作
  info: 4000,         // 信息通知
  warning: 5000,      // 警告信息
  error: 6000,        // 错误信息
  urgent: 0,          // 持久显示
  batchOperation: 4000 // 批量操作
}
```

### 4. 批量操作模式
```typescript
// 大量数据处理时使用进度追踪
if (items.length > 10) {
  const tracker = new BatchOperationTracker(operation, items.length, type)
  // 使用tracker.updateProgress()实时更新
} else {
  // 少量数据直接使用结果Toast
  batchOperationToastHelper.projectBatchUpdate(items.length, items.length, '状态')
}
```

## 故障排除

### 常见问题

1. **Toast不显示**
   - 检查ToastContainer是否正确集成到主布局
   - 确认没有被其他CSS样式遮挡（z-index问题）

2. **动画性能问题**
   - 检查是否启用了用户减少动画偏好
   - 使用性能监控器检查帧率
   - 考虑降低同时显示的Toast数量

3. **键盘导航不工作**
   - 确认启用了键盘导航配置
   - 检查Toast元素是否正确设置了tabindex

4. **屏幕阅读器支持问题**
   - 验证aria-live区域是否正确创建
   - 检查消息是否包含足够的上下文信息

### 调试工具

1. **测试页面**: `/debug-api/toast-system-test` - 完整的系统测试
2. **批量操作测试**: `/debug-api/batch-toast-test` - 批量操作专项测试
3. **性能监控**: 使用`useToastPerformanceMonitor`监控性能指标

## API参考

### 核心Hooks
- `useToast()` - 主要Toast管理Hook
- `useSmartSuggestions()` - 智能提示系统Hook
- `useToastAccessibility()` - 可访问性支持Hook
- `useToastPerformanceMonitor()` - 性能监控Hook

### 辅助模块
- `projectToastHelper` - 项目管理Toast辅助
- `materialToastHelper` - 材料管理Toast辅助  
- `drawingToastHelper` - 图纸管理Toast辅助
- `workerToastHelper` - 工人管理Toast辅助
- `batchOperationToastHelper` - 批量操作Toast辅助

### 系统配置
- `globalAccessibilitySettings` - 全局可访问性配置
- `toastQueueManager` - Toast队列管理
- `smartSuggestionEngine` - 智能提示引擎
- `sseToastMapper` - SSE事件映射器

## 更新日志

### v1.0.0 (2024)
- ✅ 基础Toast组件和容器
- ✅ 业务模块集成（项目、材料、图纸、工人）
- ✅ 四状态循环材料管理支持
- ✅ 批量操作Toast系统
- ✅ 智能提示引擎
- ✅ SSE事件自动映射
- ✅ 完整可访问性支持
- ✅ 动画和性能优化
- ✅ 综合测试和文档

---

**技术支持**: 如有问题请访问项目测试页面或查看源码注释获取更多信息。
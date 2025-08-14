# 🎯 激光切割生产管理系统 - Toast智能提示修订方案

## 📋 基于真实业务功能的Toast扩展

### 核心原则
✅ **只针对实际存在的功能**  
✅ **基于真实API端点和SSE事件**  
✅ **解决实际用户体验痛点**  
❌ **不添加虚构的业务场景**

---

## 🏭 一、项目管理模块（真实功能Toast）

### 1.1 项目生命周期管理

| 触发点 | Toast类型 | 触发条件 | 消息示例 | 实际价值 |
|-------|----------|----------|----------|----------|
| 项目创建API成功 | `project-created` | POST /api/projects 成功响应 | `项目 "激光切割外壳" 创建成功，已分配给张师傅` | 创建确认 + 分配提醒 |
| 项目信息更新 | `project-updated` | PUT /api/projects/:id 成功响应 | `项目信息已更新：优先级调整为高` | 更新内容明确反馈 |
| 项目删除确认 | `project-deleted` | DELETE /api/projects/:id 成功响应 | `项目 "激光切割外壳" 已删除，包含3个图纸文件` | 删除范围确认 |
| 过往项目移动 | `project-archived` | POST /api/projects/:id/move-to-past 成功 | `项目已移动到过往项目库，释放活跃列表空间` | 归档确认 |
| 项目排序调整 | `batch-operation` | PUT /api/projects/reorder 成功响应 | `项目排序已更新，影响5个项目` | 批量操作确认 |

### 1.2 状态自动更新反馈

| 触发点 | Toast类型 | 触发条件 | 消息示例 | 实际价值 |
|-------|----------|----------|----------|----------|
| 项目状态自动变更 | `project-status-auto` | 材料状态变化触发项目状态更新 | `项目状态自动更新为"进行中"（原因：材料开始加工）` | 解释自动更新原因 |
| 项目完成庆祝 | `wancheng` | 所有材料状态变为completed | `🎉 恭喜！项目 "激光切割外壳" 圆满完成` | 完成成就感 |
| 工人重新分配 | `worker-reassigned` | assignedWorkerId字段更新 | `项目已重新分配：张师傅 → 李师傅` | 分配变更确认 |

---

## 📦 二、材料管理模块（四状态循环Toast）

### 2.1 材料状态循环反馈（核心功能）

| 状态转换 | Toast类型 | 触发条件 | 消息示例 | 音频提示 |
|----------|-----------|----------|----------|----------|
| empty → pending | `material-allocated` | 新材料分配给项目 | `2mm碳板 已分配给项目"激光切割外壳"` | success.wav |
| pending → in_progress | `material-started` | 状态更新为in_progress | `张师傅开始加工 2mm碳板` | success.wav |
| in_progress → completed | `material-completed` | 状态更新为completed | `🎉 2mm碳板 加工完成！` | wancheng.wav |
| completed → empty | `material-recycled` | 材料回收为空闲状态 | `材料已回收，可重新分配使用` | info.wav |
| 批量状态更新 | `batch-operation` | PUT /api/materials/batch/status | `批量更新完成：5个材料状态已变更` | success.wav |

### 2.2 工人材料库存管理Toast

| 操作类型 | Toast类型 | 触发条件 | 消息示例 | 扩展信息 |
|----------|-----------|----------|----------|----------|
| 库存添加成功 | `stock-added` | POST /api/worker-materials 成功 | `张师傅库存已增加：2mm碳板 50张` | 显示总库存数量 |
| 材料分配成功 | `material-allocated` | POST /api/materials/allocate 成功 | `成功分配15张3mm碳板给项目A（从张师傅库存）` | 库存余量提示 |
| 库存不足警告 | `stock-warning` | 分配时库存不足 | `⚠️ 张师傅 2mm碳板库存不足：剩余3张，需求15张` | 建议采购数量 |
| 尺寸记录添加 | `dimension-added` | POST /api/material-dimensions 成功 | `已添加尺寸规格：600×400mm 共10张` | 尺寸明细确认 |
| 跨工人调拨 | `material-transferred` | 工人间材料调拨 | `10张3mm碳板已从张师傅调拨给李师傅` | 调拨记录确认 |

### 2.3 95/5策略智能提醒

| 场景 | Toast类型 | 触发条件 | 消息示例 | 操作建议 |
|------|-----------|----------|----------|----------|
| 碳板比例偏低 | `strategy-deviation` | 碳板比例 < 90% | `⚠️ 碳板使用率87%，偏离95%目标` | 建议减少特殊材料 |
| 特殊材料过多 | `strategy-warning` | 特殊材料比例 > 10% | `特殊材料占比12%，建议控制在5%以内` | 提供调整建议 |
| 策略回归正常 | `strategy-balanced` | 比例回到95/5范围 | `✅ 材料配比已回归95/5策略目标` | 策略执行确认 |

---

## 📐 三、图纸管理模块（DXF处理Toast）

### 3.1 文件上传处理流程

| 上传阶段 | Toast类型 | 触发条件 | 消息示例 | 进度显示 |
|----------|-----------|----------|----------|----------|
| 上传进度 | `file-uploading` | 文件上传中 | `正在上传图纸 "外壳设计v2.dxf" (75%)` | ✅ 进度条 |
| 上传成功 | `file-uploaded` | POST /api/drawings/upload 成功 | `图纸 "外壳设计v2.dxf" 上传成功` | 预览/关联按钮 |
| DXF解析完成 | `dxf-parsed` | 文件解析处理完成 | `DXF文件解析完成，可进行3D预览` | 预览按钮 |
| 常用零件标记 | `common-part-tagged` | isCommonPart=true | `图纸已标记为常用零件，将在库中分类显示` | 分类确认 |
| 上传失败 | `upload-error` | 上传API返回错误 | `❌ 图纸上传失败：文件格式不支持` | 重试建议 |

### 3.2 版本管理Toast

| 版本操作 | Toast类型 | 触发条件 | 消息示例 | 版本信息 |
|----------|-----------|----------|----------|----------|
| 版本自动更新 | `version-updated` | 同名文件版本递增 | `图纸版本已自动更新至 v2.1` | 版本历史链接 |
| 版本冲突提醒 | `version-conflict` | 检测到同名文件 | `⚠️ 发现同名图纸，将自动创建新版本` | 版本对比选项 |
| 旧版本废弃 | `version-deprecated` | 新版本上传后 | `旧版本 v2.0 已标记为废弃状态` | 版本管理提醒 |

### 3.3 图纸关联管理

| 关联操作 | Toast类型 | 触发条件 | 消息示例 | 关联信息 |
|----------|-----------|----------|----------|----------|
| 图纸关联项目 | `drawing-linked` | 图纸分配给特定项目 | `图纸已关联到项目 "激光切割外壳"` | 项目链接 |
| 图纸移除关联 | `drawing-unlinked` | 图纸从项目移除 | `图纸已从项目中移除，返回图纸库` | 移除确认 |

---

## 👷 四、工人管理模块（实际存在功能）

### 4.1 工人信息管理Toast

| 操作类型 | Toast类型 | 触发条件 | 消息示例 | 详细信息 |
|----------|-----------|----------|----------|----------|
| 工人信息更新 | `worker-updated` | PUT /api/workers/:id 成功 | `工人信息已更新：张师傅 - 精密加工部` | 更新字段明细 |
| 新工人添加 | `worker-added` | POST /api/workers 成功 | `新工人已加入团队：李师傅 - 精密加工部` | 工人基本信息 |
| 工人删除确认 | `worker-removed` | DELETE /api/workers/:id 成功 | `工人已移除，相关项目需要重新分配` | 影响的项目数量 |

### 4.2 工人负载提醒

| 负载情况 | Toast类型 | 触发条件 | 消息示例 | 建议操作 |
|----------|-----------|----------|----------|----------|
| 工人任务过多 | `worker-overloaded` | 工人分配项目 > 5个 | `⚠️ 张师傅当前负责7个项目，建议合理分配` | 任务重分配建议 |
| 工人空闲可用 | `worker-available` | 工人完成所有项目 | `✅ 李师傅目前无在进行项目，可分配新任务` | 分配新项目按钮 |
| 负载平衡优化 | `workload-balanced` | 工人项目分配调整 | `团队工作负载已优化平衡` | 负载分布图表 |

---

## 🔄 五、实时同步与协作Toast（SSE事件）

### 5.1 SSE事件对应Toast

| SSE事件 | Toast类型 | 消息示例 | 显示时机 | 协作价值 |
|---------|-----------|----------|----------|----------|
| project-created | `collaboration-notify` | `李用户创建了新项目 "医疗器械外壳"` | 其他用户看到 | 团队感知 |
| material-status-changed | `sync-updated` | `张用户更新了材料状态：2mm碳板→进行中` | 实时同步 | 状态同步 |
| project-deleted | `collaboration-alert` | `管理员删除了项目 "废弃设计"` | 高优先级通知 | 重要变更提醒 |
| worker-assigned | `assignment-changed` | `王用户将项目重新分配给李师傅` | 分配变更 | 工作调配透明化 |

### 5.2 数据同步状态Toast

| 同步状态 | Toast类型 | 消息示例 | 持续时间 | 用户操作 |
|----------|-----------|----------|----------|----------|
| 同步成功 | `sync-completed` | `✅ 数据同步完成，更新了12条记录` | 3秒 | 无需操作 |
| 同步失败 | `sync-error` | `❌ 数据同步失败，请检查网络连接` | 持续显示 | 重试按钮 |
| 连接断开 | `connection-lost` | `⚠️ 实时连接中断，正在重连...` | 持续显示 | 重连进度 |
| 连接恢复 | `connection-restored` | `✅ 实时连接已恢复` | 2秒 | 无需操作 |

---

## 🧠 六、智能辅助功能（基于现有数据）

### 6.1 基于历史数据的智能提示

| 智能场景 | Toast类型 | 触发条件 | 消息示例 | 智能价值 |
|----------|-----------|----------|----------|----------|
| 相似项目检测 | `smart-suggestion` | 项目名称模糊匹配历史 | `💡 检测到类似项目，是否复制材料配置？` | 效率提升 |
| 材料使用模式 | `pattern-insight` | 基于历史材料使用分析 | `💡 该项目类型通常需要2mm和3mm碳板` | 经验传承 |
| 工人技能匹配 | `skill-match` | 基于工人历史项目类型 | `💡 张师傅在精密加工项目上表现优异` | 最佳分配 |
| 项目周期预测 | `timeline-insight` | 基于相似项目完成时间 | `💡 类似项目通常需要5-7天完成` | 时间规划 |

### 6.2 效率优化建议

| 优化类型 | Toast类型 | 分析依据 | 消息示例 | 改进建议 |
|----------|-----------|----------|----------|----------|
| 材料利用率 | `efficiency-insight` | 材料完成统计分析 | `📊 本周材料利用率92%，比上周提升3%` | 继续保持趋势 |
| 项目完成率 | `performance-report` | 项目状态统计 | `📊 本月项目完成率85%，超过目标10%` | 团队表现肯定 |
| 瓶颈识别 | `bottleneck-detected` | 状态停留时间分析 | `⚠️ 发现瓶颈：材料从待处理到进行中平均耗时过长` | 流程优化建议 |
| 工作流优化 | `workflow-optimization` | 操作路径分析 | `💡 建议：批量处理相同厚度材料可提升20%效率` | 操作方式改进 |

---

## 🎯 实施计划（修订版）

### 第一阶段：核心操作反馈（2周）
**目标**：为所有真实的CRUD操作添加Toast反馈

1. **项目管理Toast**
   - 项目创建/更新/删除的成功确认
   - 项目状态自动变更的原因解释
   - 工人分配变更的明确提示

2. **材料四状态循环Toast**
   - empty→pending→in_progress→completed→empty 每个转换的反馈
   - 状态变更音频提示集成
   - 批量操作的进度和结果确认

3. **图纸上传Toast**
   - DXF上传进度实时显示
   - 上传成功/失败的明确结果
   - 版本管理的自动化提示

### 第二阶段：智能提示与优化（2周）
**目标**：基于真实数据提供智能建议

1. **库存管理智能化**
   - 材料库存不足的主动预警
   - 分配建议基于工人实际库存
   - 95/5策略偏离的及时提醒

2. **工作流程优化**
   - 基于历史数据的项目模式识别
   - 工人技能匹配的智能建议
   - 材料使用效率的分析洞察

3. **实时协作增强**
   - SSE事件的Toast可视化
   - 多用户操作的透明化提示
   - 数据同步状态的清晰反馈

### 第三阶段：用户体验完善（1周）
**目标**：优化Toast交互体验

1. **个性化设置**
   - Toast类型的显示偏好设置
   - 音频提示的开关控制
   - 智能建议的接受/忽略机制

2. **高级交互功能**
   - Toast中的快捷操作按钮
   - 展开/收缩的详细信息显示
   - 历史Toast的查看和管理

---

## 💡 技术实现要点

### Toast组件增强
```typescript
interface EnhancedToastProps {
  // 基础属性
  message: string;
  type: ToastType;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // 智能功能
  expandable?: boolean;
  details?: string;
  actions?: ToastAction[];
  
  // 业务集成
  relatedData?: any;
  audioType?: AudioType;
  showProgress?: boolean;
  progress?: number;
}
```

### SSE事件映射
```javascript
// SSE事件自动触发对应Toast
const sseToastMapping = {
  'project-created': 'collaboration-notify',
  'material-status-changed': 'sync-updated', 
  'worker-assigned': 'assignment-changed',
  'project-deleted': 'collaboration-alert'
}
```

### 智能提示触发机制
```javascript
// 基于业务规则的智能提示
const smartTriggers = {
  // 库存不足检测
  stockCheck: (allocation) => {
    if (allocation.required > allocation.available) {
      return {
        type: 'stock-warning',
        message: `库存不足：需求${allocation.required}，可用${allocation.available}`
      }
    }
  },
  
  // 95/5策略检测
  ratioCheck: (materials) => {
    const carbonRatio = calculateCarbonRatio(materials);
    if (carbonRatio < 90) {
      return {
        type: 'strategy-deviation', 
        message: `碳板比例${carbonRatio}%，偏离95%目标`
      }
    }
  }
}
```

这个修订方案完全基于项目的真实功能，移除了所有虚构场景，确保每个Toast都有明确的业务价值和技术实现基础。
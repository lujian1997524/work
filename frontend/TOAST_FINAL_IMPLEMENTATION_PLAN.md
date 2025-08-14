# 激光切割生产管理系统 - Toast智能提示最终方案

## 简化设计原则

纯提示功能：去除所有按钮，专注于信息反馈  
适度详细：消息内容清晰但不冗长  
真实场景：只针对实际存在的业务功能  
体验优先：右上角显示，不干扰主要操作  
无装饰符号：使用纯文字，不含emoji或特殊符号

---

## 一、项目管理模块Toast

### 1.1 项目生命周期
| 触发点 | Toast类型 | 消息示例 |
|-------|----------|----------|
| 项目创建成功 | `project-created` | `项目 "激光切割外壳" 创建成功，已分配给张师傅` |
| 项目信息更新 | `project-updated` | `项目 "激光切割外壳" 信息已更新` |
| 项目删除确认 | `project-deleted` | `项目 "激光切割外壳" 已删除，包含3个图纸文件` |
| 状态自动更新 | `project-status-auto` | `项目"激光切割外壳"状态自动更新为进行中，原因：材料开始加工` |
| 移动到过往 | `project-archived` | `项目"激光切割外壳"已移动到过往项目库，释放活跃列表空间` |
| 工人重新分配 | `worker-reassigned` | `项目"激光切割外壳"已重新分配：张师傅 → 李师傅` |

### 1.2 项目完成庆祝
| 触发点 | Toast类型 | 消息示例 |
|-------|----------|----------|
| 项目完成 | `wancheng` | `恭喜！项目 "激光切割外壳" 圆满完成` |

---

## 二、材料管理模块Toast（四状态循环）

### 2.1 材料状态流转
| 状态转换 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| empty → pending | `material-allocated` | `2mm碳板 15张已分配给项目"激光切割外壳"` |
| pending → in_progress | `material-started` | `张师傅开始加工 2mm碳板` |
| in_progress → completed | `material-completed` | `2mm碳板 加工完成！由张师傅完成` |
| completed → empty | `material-recycled` | `2mm碳板 已回收为空闲状态，可重新分配使用` |

### 2.2 工人库存管理
| 操作类型 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| 库存增加 | `stock-added` | `张师傅库存增加：2mm碳板 50张` |
| 库存不足 | `stock-warning` | `警告：张师傅 2mm碳板库存不足：剩余3张，需求15张` |
| 尺寸添加 | `dimension-added` | `已添加尺寸规格：2mm碳板 600×400mm 共10张` |
| 材料调拨 | `material-transferred` | `10张3mm碳板已从张师傅调拨给李师傅` |

### 2.3 95/5策略监控
| 场景 | Toast类型 | 消息示例 |
|------|-----------|----------|
| 比例偏离 | `strategy-deviation` | `警告：碳板使用率87%，偏离95%目标，建议减少特殊材料使用` |
| 比例正常 | `strategy-balanced` | `材料配比已回归95/5策略目标，保持良好状态` |

---

## 三、图纸管理模块Toast

### 3.1 文件上传处理
| 上传阶段 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| 上传进度 | `file-uploading` | `正在上传图纸 "外壳设计v2.dxf" (75%)` |
| 上传成功 | `file-uploaded` | `图纸 "外壳设计v2.dxf" 上传成功` |
| DXF解析 | `dxf-parsed` | `图纸"外壳设计v2.dxf"解析完成，可进行3D预览和编辑` |
| 常用零件 | `common-part-tagged` | `图纸"标准接口"已标记为常用零件，将在库中分类显示` |
| 上传失败 | `upload-error` | `图纸上传失败：文件格式不支持` |

### 3.2 版本管理
| 版本操作 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| 版本更新 | `version-updated` | `图纸"外壳设计"版本已自动更新至 v2.1` |
| 版本冲突 | `version-conflict` | `注意：发现同名图纸"外壳设计"，系统将自动创建新版本` |
| 图纸关联 | `drawing-linked` | `图纸"外壳设计v2.dxf"已成功关联到项目"激光切割外壳"` |

---

## 四、工人管理模块Toast

### 4.1 工人信息管理
| 操作类型 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| 信息更新 | `worker-updated` | `工人信息已更新：张师傅 - 精密加工部` |
| 新工人加入 | `worker-added` | `新工人加入团队：李师傅 (精密加工部)` |
| 工人移除 | `worker-removed` | `工人已移除，相关项目需要重新分配` |

### 4.2 工作负载提醒
| 负载情况 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| 负载过重 | `worker-overloaded` | `注意：张师傅当前负责7个项目，工作负载较重` |
| 工人空闲 | `worker-available` | `李师傅目前无在进行项目，可分配新任务` |

---

## 五、实时同步与协作Toast

### 5.1 SSE事件反馈
| SSE事件 | Toast类型 | 消息示例 |
|---------|-----------|----------|
| 协作通知 | `collaboration-notify` | `李用户 创建了新项目 "医疗器械外壳"` |
| 同步更新 | `sync-updated` | `张用户更新了材料状态：2mm碳板→进行中` |
| 数据同步 | `sync-completed` | `数据同步完成，更新了12条记录` |
| 同步错误 | `sync-error` | `数据同步失败，请检查网络连接后重试` |
| 连接中断 | `connection-lost` | `实时连接中断，正在自动重连中...` |
| 连接恢复 | `connection-restored` | `实时连接已恢复，数据同步正常` |

---

## 六、智能辅助Toast

### 6.1 基于历史数据的智能提示
| 智能场景 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| 相似项目检测 | `smart-suggestion` | `智能建议：检测到类似项目，是否复制材料配置？` |
| 使用模式识别 | `pattern-insight` | `发现规律：该项目类型通常需要2mm和3mm碳板 (历史数据分析)` |
| 效率分析 | `efficiency-insight` | `效率分析：本周材料利用率92%，比上周提升3%` |
| 工作流优化 | `workflow-optimization` | `优化建议：批量处理相同厚度材料，预期效果：提升20%效率` |
| 瓶颈识别 | `bottleneck-detected` | `发现生产瓶颈：材料待处理时间过长，建议：优化分配流程` |

---

## 批量操作Toast

### 6.1 批量处理反馈
| 操作结果 | Toast类型 | 消息示例 |
|----------|-----------|----------|
| 批量成功 | `batch-operation` | `批量状态更新完成：成功处理8条记录` |
| 部分成功 | `batch-operation` | `批量状态更新部分完成：8条记录中部分成功` |
| 批量失败 | `batch-operation` | `批量状态更新失败：8条记录处理失败` |

---

## 💻 技术实现特点

### Toast组件简化设计
```typescript
interface SimplifiedToastProps {
  message: string;              // 适度详细的提示消息
  type: BusinessToastType;      // 基于真实业务的类型
  priority?: 'normal' | 'high' | 'urgent'; // 优先级
  duration?: number;            // 显示时长
  persistent?: boolean;         // 是否持续显示
  showTime?: boolean;           // 显示时间戳
  showProgress?: boolean;       // 显示进度（仅上传等场景）
  // 移除：actions, expandable, details, buttons
}
```

### 音频反馈映射
```typescript
const audioMapping = {
  'material-completed': 'wancheng.wav',  // 完成庆祝音效
  'material-started': 'success.wav',     // 开始音效
  'stock-warning': 'warning.wav',        // 警告音效
  'project-archived': 'info.wav',        // 信息音效
  'sync-error': 'error.wav'              // 错误音效
}
```

### SSE事件自动映射
```typescript
// SSE事件自动触发对应Toast
const sseToastMapping = {
  'project-created': (data) => toast.projectCreated(data.project.name, data.workerName),
  'material-status-changed': (data) => {
    if (data.newStatus === 'in_progress') {
      toast.materialStarted(data.materialType, data.workerName)
    } else if (data.newStatus === 'completed') {
      toast.materialCompleted(data.materialType, data.workerName)
    }
  },
  'project-deleted': (data) => toast.projectDeleted(data.projectName, data.deletedDrawingsCount)
}
```

## 🎯 实施优先级

### 第一阶段：核心反馈（2周）
1. **项目操作Toast** - 创建、更新、删除的即时反馈
2. **材料四状态Toast** - 每个状态转换的清晰提示
3. **文件上传Toast** - DXF上传进度和结果反馈

### 第二阶段：业务优化（2周）
1. **库存管理Toast** - 材料分配、库存预警
2. **实时协作Toast** - SSE事件可视化
3. **智能提示Toast** - 基于历史数据的建议

### 第三阶段：用户体验（1周）
1. **音频集成** - 为重要Toast添加音效
2. **优先级管理** - urgent类型Toast持续显示
3. **批量操作反馈** - 大批量操作的进度和结果

---

## ✨ 设计亮点

1. **纯净体验**：去除所有按钮和复杂交互，专注信息传达
2. **适度详细**：消息内容恰到好处，既清晰又不冗长
3. **真实场景**：100%基于实际业务功能，无虚构场景
4. **智能感知**：基于历史数据提供有价值的操作建议
5. **实时协作**：SSE事件自动转换为可视化Toast提示
6. **优雅降级**：网络问题等异常情况的友好提示

这个最终方案完全符合用户需求：简化Toast为纯提示功能，消息适度详细，专注于真实业务场景的用户体验提升。
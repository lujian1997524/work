# 🎯 激光切割生产管理系统 - Toast提示增加清单

## 📊 已扩展的Toast功能

### 🔥 新增Toast类型
- ✅ `project-created` - 项目创建（绿色，+图标，info.wav）
- ✅ `project-updated` - 项目更新（蓝色，↻图标，info.wav）  
- ✅ `project-deleted` - 项目删除（红色，🗑图标，error.wav）
- ✅ `material-changed` - 材料状态变更（紫色，▶图标，success.wav）
- ✅ `file-uploaded` - 文件上传（靛蓝色，↗图标，info.wav）
- ✅ `sync-completed` - 数据同步（青绿色，↙图标，info.wav）
- ✅ `wancheng` - 任务完成（翠绿色，✓图标，wancheng.wav）

### 🎨 新增功能特性
- ✅ **音频提示**：每个Toast自动播放对应音效
- ✅ **进度显示**：支持进度条和动态更新
- ✅ **交互操作**：支持操作按钮和用户交互
- ✅ **视觉变体**：filled/outline/glass三种样式
- ✅ **尺寸控制**：sm/md/lg三种大小
- ✅ **持久显示**：可配置不自动关闭

---

## 🚀 建议增加的Toast提示场景

### 1️⃣ 项目管理模块

#### 项目操作
- [ ] **项目状态变更**
  ```javascript
  // 项目状态：待开始 → 进行中 → 已完成 → 已交付
  toast.projectStatusChanged('激光切割精密零件', 'in_progress')
  // 提示：项目"激光切割精密零件"状态变更为进行中
  ```

- [ ] **项目分配工人**
  ```javascript
  toast.workerAssigned('激光切割精密零件', '张师傅')
  // 提示：项目已分配给张师傅
  ```

- [ ] **项目优先级调整**
  ```javascript
  toast.priorityChanged('紧急订单-汽车零件', '高优先级')
  // 提示：项目优先级已调整为高优先级
  ```

- [ ] **项目截止日期提醒**
  ```javascript
  toast.deadlineWarning('钣金外壳加工', '2天')
  // 提示：项目截止时间还剩2天，请注意安排进度
  ```

#### 批量操作
- [ ] **批量项目操作**
  ```javascript
  toast.batchProjectUpdate(5, 'success')
  // 提示：已成功更新5个项目状态
  ```

- [ ] **项目导入导出**
  ```javascript
  toast.projectExported('2024年1月项目数据.xlsx')
  // 提示：项目数据导出完成
  ```

### 2️⃣ 材料管理模块

#### 材料状态管理
- [ ] **材料库存警告**
  ```javascript
  toast.stockWarning('3mm不锈钢板', 5, 20)
  // 提示：3mm不锈钢板库存不足(5/20)，建议及时补货
  ```

- [ ] **材料入库**
  ```javascript
  toast.materialReceived('5mm铝合金板', 50)
  // 提示：5mm铝合金板已入库，数量：50张
  ```

- [ ] **材料调拨**
  ```javascript
  toast.materialTransferred('2mm碳钢板', '车间A', '车间B', 10)
  // 提示：10张2mm碳钢板已从车间A调拨至车间B
  ```

- [ ] **材料质检结果**
  ```javascript
  toast.qualityCheckResult('批次20240315', 'passed')
  // 提示：批次20240315质检通过，可正常使用
  ```

#### 材料分配和回收
- [ ] **材料分配确认**
  ```javascript
  toast.materialAllocated('项目A', '3mm不锈钢板', 15)
  // 提示：已为项目A分配15张3mm不锈钢板
  ```

- [ ] **材料回收**
  ```javascript
  toast.materialRecycled('项目B剩余材料', 8)
  // 提示：项目B剩余8张材料已回收入库
  ```

### 3️⃣ 图纸管理模块

#### 图纸操作
- [ ] **图纸版本更新**
  ```javascript
  toast.drawingVersionUpdated('精密零件.dxf', 'v2.1')
  // 提示：图纸已更新至v2.1版本
  ```

- [ ] **图纸审核**
  ```javascript
  toast.drawingApproved('汽车配件图纸.dwg', '李工程师')
  // 提示：图纸已通过李工程师审核，可投入生产
  ```

- [ ] **图纸格式转换**
  ```javascript
  toast.formatConverted('CAD设计图.dwg', 'DXF')
  // 提示：文件格式转换完成：CAD设计图.dwg → DXF
  ```

#### 文件管理
- [ ] **批量文件上传**
  ```javascript
  toast.batchUploadCompleted(12, 2)
  // 提示：批量上传完成：12个文件成功，2个失败
  ```

- [ ] **文件分享**
  ```javascript
  toast.fileShared('技术规范.pdf', '生产部')
  // 提示：文件已分享给生产部，具备查看权限
  ```

### 4️⃣ 工人管理模块

#### 工人操作
- [ ] **工人签到签退**
  ```javascript
  toast.workerCheckedIn('张师傅', '8:30')
  // 提示：张师傅已签到，时间：8:30
  ```

- [ ] **工人技能认证**
  ```javascript
  toast.skillCertified('李师傅', '激光切割高级操作')
  // 提示：李师傅获得激光切割高级操作认证
  ```

- [ ] **工人绩效评估**
  ```javascript
  toast.performanceRated('王师傅', 'A级')
  // 提示：王师傅本月绩效评定：A级
  ```

### 5️⃣ 设备管理模块

#### 设备状态
- [ ] **设备维护提醒**
  ```javascript
  toast.maintenanceReminder('激光切割机001', '例行保养')
  // 提示：激光切割机001需要进行例行保养
  ```

- [ ] **设备故障报警**
  ```javascript
  toast.equipmentFault('切割机002', '切割头温度过高')
  // 提示：切割机002故障：切割头温度过高，请立即检查
  ```

- [ ] **设备使用率统计**
  ```javascript
  toast.usageReport('本周设备使用率', '85%')
  // 提示：本周设备使用率：85%，效率良好
  ```

### 6️⃣ 生产计划模块

#### 生产安排
- [ ] **生产计划调整**
  ```javascript
  toast.scheduleAdjusted('今日生产计划', '新增2个紧急订单')
  // 提示：生产计划已调整：新增2个紧急订单
  ```

- [ ] **产能预警**
  ```javascript
  toast.capacityWarning('下周产能', '超负荷15%')
  // 提示：下周产能预警：超负荷15%，建议调整排期
  ```

### 7️⃣ 质量管理模块

#### 质检流程
- [ ] **质检任务分配**
  ```javascript
  toast.qcTaskAssigned('批次20240315', '质检员小李')
  // 提示：质检任务已分配给质检员小李
  ```

- [ ] **质检不合格处理**
  ```javascript
  toast.qcFailed('产品批次A001', '尺寸偏差')
  // 提示：产品批次A001质检不合格：尺寸偏差，需返工处理
  ```

### 8️⃣ 系统管理模块

#### 数据操作
- [ ] **数据备份完成**
  ```javascript
  toast.dataBackuped('2024-03-15 23:30')
  // 提示：数据备份完成，备份时间：2024-03-15 23:30
  ```

- [ ] **权限变更**
  ```javascript
  toast.permissionChanged('用户张三', '管理员权限')
  // 提示：用户张三权限已变更为管理员权限
  ```

- [ ] **系统更新**
  ```javascript
  toast.systemUpdated('v2.1.3', '新增批量导出功能')
  // 提示：系统已更新至v2.1.3，新增批量导出功能
  ```

#### 安全相关
- [ ] **异常登录检测**
  ```javascript
  toast.suspiciousLogin('用户李四', 'IP异常')
  // 提示：检测到用户李四异常登录（IP异常），已发送验证码
  ```

---

## 🎵 音频提示配置建议

### 新增音效文件需求
```javascript
// 建议新增音效
const newSoundFiles = {
  'material-warning': '/sounds/material-warning.wav',    // 材料库存警告音
  'equipment-fault': '/sounds/equipment-fault.wav',      // 设备故障警报音  
  'quality-failed': '/sounds/quality-failed.wav',        // 质检不合格警告音
  'urgent-task': '/sounds/urgent-task.wav',              // 紧急任务提醒音
  'maintenance': '/sounds/maintenance.wav',               // 维护保养提醒音
  'batch-complete': '/sounds/batch-complete.wav',        // 批量操作完成音
  'worker-checkin': '/sounds/worker-checkin.wav',        // 工人签到音
  'schedule-change': '/sounds/schedule-change.wav'       // 计划变更提醒音
}
```

### 音效智能匹配策略
```javascript
// 根据业务场景自动选择音效
const getBusinessSound = (toastType, content) => {
  // 紧急/故障类
  if (content.includes('故障') || content.includes('紧急')) {
    return 'equipment-fault';
  }
  
  // 警告类
  if (content.includes('警告') || content.includes('不足') || content.includes('超负荷')) {
    return 'material-warning';
  }
  
  // 质检类
  if (content.includes('不合格') || content.includes('返工')) {
    return 'quality-failed';
  }
  
  // 批量操作类
  if (content.includes('批量') || content.includes('批次')) {
    return 'batch-complete';
  }
  
  // 默认音效
  return audioManager.getNotificationSound(toastType, '', content);
}
```

---

## 📋 实施计划

### Phase 1: 核心业务提示（1周）
- [ ] 项目状态变更提示
- [ ] 材料状态管理提示  
- [ ] 文件上传/审核提示
- [ ] 工人操作提示

### Phase 2: 高级功能提示（1周）
- [ ] 库存警告和补货提示
- [ ] 设备状态和维护提示
- [ ] 生产计划调整提示
- [ ] 质检流程提示

### Phase 3: 系统级提示（1周）
- [ ] 数据备份和同步提示
- [ ] 权限和安全提示
- [ ] 系统更新和维护提示
- [ ] 性能监控提示

---

## 🎯 预期效果

通过增加这些Toast提示，系统将具备：

1. **即时反馈**：用户操作得到立即确认
2. **状态感知**：清晰了解各模块运行状态  
3. **异常预警**：及时发现和处理问题
4. **操作引导**：帮助用户完成复杂流程
5. **效率提升**：减少页面跳转和状态查询
6. **用户体验**：统一、优雅的通知体验

预估新增 **50+ 个业务场景提示**，覆盖激光切割生产管理的全流程操作。
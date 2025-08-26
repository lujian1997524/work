# 删除Workers表废弃的department字段

## 背景
在v2.8.0版本中，我们发现了数据库设计中的一个问题：workers表同时存在两个部门相关字段：
- `department` - 废弃的字符串字段（数据为null）
- `departmentId` - 正确的外键字段（关联departments表）

这导致了API查询中的混乱，部分代码错误地使用了废弃的`department`字段。

## 已完成的修复
✅ **代码层面修复**：
- 修复了5个文件中的错误`department`字段引用
- 所有API现在正确使用`departmentId`关联departments表
- Excel导出正确显示部门名称

✅ **文档更新**：
- 在CLAUDE.md中添加了数据库字段约束规范
- 明确禁止使用废弃的`department`字段

## 需要执行的数据库迁移

### 执行迁移脚本
```bash
# 连接到数据库并执行迁移
mysql -h [HOST] -P [PORT] -u laser_user -p < /Users/gao/Desktop/work/backend/database/migrations/remove_deprecated_department_field.sql
```

### 迁移脚本功能
1. **安全检查**：检查字段是否存在
2. **条件删除**：只在字段存在时执行删除
3. **验证检查**：确认删除成功
4. **完整性检查**：确认departmentId字段仍然存在
5. **结构展示**：显示workers表的最终字段结构

### 预期结果
- ✅ `department`字段被删除
- ✅ `departmentId`字段保留
- ✅ 所有关联和索引正常
- ✅ 现有数据不受影响

## 验证
迁移完成后，可以通过以下API验证：
```bash
curl -s "https://api.gei5.com/api/queue/projects/laser_queue_2025_public" | python3 -c "
import sys, json
data = json.load(sys.stdin)
worker = data['projects'][0]['assignedWorker']
print(f'部门信息: {worker[\"departmentInfo\"][\"name\"]}')
"
```

应该显示正确的部门名称（如"东厂"、"西厂"等）而不是"未分配部门"。

## 重要提醒
此操作是不可逆的，但由于`department`字段本身就是废弃字段（数据为null），删除不会造成数据丢失。所有部门信息都通过`departmentId`→`departments`表的关联正确保存。
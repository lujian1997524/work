#!/bin/bash
# 考勤系统后端验证脚本

echo "==================================="
echo "考勤系统后端实现验证"
echo "==================================="

echo "1. 检查模型文件..."
models=(
    "src/models/Employee.js"
    "src/models/AttendanceException.js"
    "src/models/AttendanceSettings.js"
    "src/models/MonthlyAttendanceSummary.js"
)

for model in "${models[@]}"; do
    if [ -f "$model" ]; then
        echo "✅ $model - 存在"
    else
        echo "❌ $model - 缺失"
    fi
done

echo ""
echo "2. 检查路由文件..."
routes=(
    "src/routes/employees.js"
    "src/routes/attendance.js"
)

for route in "${routes[@]}"; do
    if [ -f "$route" ]; then
        echo "✅ $route - 存在"
    else
        echo "❌ $route - 缺失"
    fi
done

echo ""
echo "3. 检查app.js注册..."
if grep -q "employees\|attendance" src/app.js; then
    echo "✅ 考勤路由已注册"
else
    echo "❌ 考勤路由未注册"
fi

echo ""
echo "4. 检查models/index.js..."
if grep -q "Employee\|AttendanceException" src/models/index.js; then
    echo "✅ 考勤模型已导出"
else
    echo "❌ 考勤模型未导出"
fi

echo ""
echo "5. 检查数据库迁移脚本..."
if [ -f "database/migrations/attendance_migration_safe.sql" ]; then
    echo "✅ 安全迁移脚本存在"
else
    echo "❌ 安全迁移脚本缺失"
fi

echo ""
echo "6. API端点概述:"
echo "GET    /api/employees           - 获取员工列表"
echo "POST   /api/employees           - 创建员工"
echo "PUT    /api/employees/:id       - 更新员工"
echo "DELETE /api/employees/:id       - 删除员工"
echo "GET    /api/employees/departments/list - 获取部门列表"
echo "GET    /api/employees/statistics/overview - 员工统计"
echo ""
echo "GET    /api/attendance/exceptions     - 获取考勤异常"
echo "POST   /api/attendance/exceptions     - 创建考勤异常"
echo "PUT    /api/attendance/exceptions/:id - 更新考勤异常"
echo "DELETE /api/attendance/exceptions/:id - 删除考勤异常"
echo "GET    /api/attendance/summary        - 月度汇总"
echo "POST   /api/attendance/summary/calculate - 计算汇总"
echo "GET    /api/attendance/settings       - 获取设置"
echo "PUT    /api/attendance/settings       - 更新设置"
echo "GET    /api/attendance/status/today   - 今日状态"

echo ""
echo "==================================="
echo "验证完成"
echo "==================================="
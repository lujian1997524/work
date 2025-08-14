#!/bin/bash

# ==========================================
# 考勤管理系统数据库表创建脚本
# 创建日期: 2025年1月
# 描述: 安全创建考勤管理系统所需的数据库表
# ==========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认数据库配置
DEFAULT_DB_HOST="localhost"
DEFAULT_DB_PORT="3330"
DEFAULT_DB_NAME="laser_cutting_db"
DEFAULT_DB_USER="laser_user"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}考勤管理系统数据库表创建脚本${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示此帮助信息"
    echo "  -H, --host HOST         数据库主机 (默认: $DEFAULT_DB_HOST)"
    echo "  -P, --port PORT         数据库端口 (默认: $DEFAULT_DB_PORT)"
    echo "  -d, --database DB       数据库名称 (默认: $DEFAULT_DB_NAME)"
    echo "  -u, --user USER         数据库用户名 (默认: $DEFAULT_DB_USER)"
    echo "  -p, --password PASS     数据库密码 (会提示输入)"
    echo "  --dry-run              仅显示将要执行的SQL，不实际执行"
    echo "  --backup               创建表前先备份现有表"
    echo ""
    echo "示例:"
    echo "  $0                      # 使用默认配置"
    echo "  $0 --dry-run            # 预览将要执行的SQL"
    echo "  $0 --backup             # 备份后创建表"
    echo ""
}

# 记录日志
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# 错误日志
error() {
    echo -e "${RED}[ERROR $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" >&2
}

# 警告日志
warn() {
    echo -e "${YELLOW}[WARN $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# 检查MySQL连接
check_mysql_connection() {
    log "检查数据库连接..."
    
    if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
        error "无法连接到数据库，请检查连接参数"
        return 1
    fi
    
    log "数据库连接成功"
    return 0
}

# 检查数据库是否存在
check_database_exists() {
    log "检查数据库 '$DB_NAME' 是否存在..."
    
    local db_exists
    db_exists=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='$DB_NAME';" --skip-column-names --silent)
    
    if [[ -z "$db_exists" ]]; then
        error "数据库 '$DB_NAME' 不存在"
        return 1
    fi
    
    log "数据库 '$DB_NAME' 存在"
    return 0
}

# 检查表是否已存在
check_existing_tables() {
    log "检查考勤相关表是否已存在..."
    
    local tables=("employees" "attendance_exceptions" "attendance_settings" "monthly_attendance_summary" "attendance_approvals" "annual_leave_balance")
    local existing_tables=()
    
    for table in "${tables[@]}"; do
        local table_exists
        table_exists=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='$table';" --skip-column-names --silent)
        
        if [[ -n "$table_exists" ]]; then
            existing_tables+=("$table")
        fi
    done
    
    if [[ ${#existing_tables[@]} -gt 0 ]]; then
        warn "以下表已存在: ${existing_tables[*]}"
        read -p "是否继续？现有表将被保留 (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "操作已取消"
            exit 0
        fi
    fi
}

# 备份现有表
backup_tables() {
    if [[ "$BACKUP" == "true" ]]; then
        log "创建现有表的备份..."
        
        local backup_file="attendance_backup_$(date +%Y%m%d_%H%M%S).sql"
        local backup_path="/Users/gao/Desktop/work/database/backups/$backup_file"
        
        # 创建备份目录
        mkdir -p "$(dirname "$backup_path")"
        
        # 备份现有的考勤相关表
        mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
            --tables employees attendance_exceptions attendance_settings monthly_attendance_summary attendance_approvals annual_leave_balance \
            --routines --triggers > "$backup_path" 2>/dev/null || true
        
        if [[ -f "$backup_path" ]]; then
            log "备份已保存到: $backup_path"
        else
            warn "备份创建失败或没有相关表需要备份"
        fi
    fi
}

# 执行SQL脚本
execute_sql() {
    local sql_content="$1"
    local description="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${BLUE}=== $description ===${NC}"
        echo "$sql_content"
        echo ""
        return 0
    fi
    
    log "执行: $description"
    
    if ! echo "$sql_content" | mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"; then
        error "执行失败: $description"
        return 1
    fi
    
    return 0
}

# 创建考勤管理系统表
create_attendance_tables() {
    log "开始创建考勤管理系统表..."
    
    # 1. 员工信息表
    local employees_sql="
CREATE TABLE IF NOT EXISTS \`employees\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`employee_id\` varchar(50) NOT NULL COMMENT '员工工号',
  \`name\` varchar(100) NOT NULL COMMENT '员工姓名',
  \`department\` varchar(100) NOT NULL COMMENT '部门',
  \`position\` varchar(100) DEFAULT NULL COMMENT '职位',
  \`phone\` varchar(20) DEFAULT NULL COMMENT '电话号码',
  \`email\` varchar(100) DEFAULT NULL COMMENT '邮箱地址',
  \`hire_date\` date NOT NULL COMMENT '入职日期',
  \`daily_work_hours\` decimal(4,2) DEFAULT 8.00 COMMENT '日标准工作小时',
  \`status\` enum('active','inactive') DEFAULT 'active' COMMENT '员工状态',
  \`avatar\` varchar(255) DEFAULT NULL COMMENT '头像URL',
  \`notes\` text DEFAULT NULL COMMENT '备注',
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_employee_id\` (\`employee_id\`),
  KEY \`idx_department\` (\`department\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工信息表';"
    
    execute_sql "$employees_sql" "创建员工信息表" || return 1
    
    # 2. 考勤异常记录表
    local attendance_exceptions_sql="
CREATE TABLE IF NOT EXISTS \`attendance_exceptions\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`employee_id\` int(11) NOT NULL COMMENT '员工ID',
  \`date\` date NOT NULL COMMENT '考勤日期',
  \`exception_type\` enum('leave','absent','overtime') NOT NULL COMMENT '异常类型：请假/缺勤/加班',
  
  -- 请假相关字段
  \`leave_type\` enum('sick','personal','annual','compensatory') DEFAULT NULL COMMENT '请假类型：病假/事假/年假/调休',
  \`leave_duration_type\` enum('full_day','half_day','hours') DEFAULT NULL COMMENT '请假时长类型',
  \`leave_hours\` decimal(4,2) DEFAULT NULL COMMENT '请假小时数',
  \`leave_start_time\` time DEFAULT NULL COMMENT '请假开始时间',
  \`leave_end_time\` time DEFAULT NULL COMMENT '请假结束时间',
  \`leave_reason\` text DEFAULT NULL COMMENT '请假原因',
  
  -- 加班相关字段
  \`overtime_hours\` decimal(4,2) DEFAULT NULL COMMENT '加班小时数',
  \`overtime_reason\` text DEFAULT NULL COMMENT '加班原因',
  
  -- 缺勤相关字段
  \`absent_reason\` text DEFAULT NULL COMMENT '缺勤原因',
  
  -- 通用字段
  \`notes\` text DEFAULT NULL COMMENT '备注',
  \`created_by\` int(11) NOT NULL COMMENT '创建人ID',
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_employee_date_type\` (\`employee_id\`, \`date\`, \`exception_type\`),
  KEY \`idx_date\` (\`date\`),
  KEY \`idx_exception_type\` (\`exception_type\`),
  KEY \`idx_leave_type\` (\`leave_type\`),
  KEY \`idx_created_by\` (\`created_by\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤异常记录表';"
    
    execute_sql "$attendance_exceptions_sql" "创建考勤异常记录表" || return 1
    
    # 3. 考勤设置表
    local attendance_settings_sql="
CREATE TABLE IF NOT EXISTS \`attendance_settings\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`setting_key\` varchar(100) NOT NULL COMMENT '设置键名',
  \`setting_value\` text NOT NULL COMMENT '设置值',
  \`description\` varchar(255) DEFAULT NULL COMMENT '设置描述',
  \`category\` varchar(50) DEFAULT 'general' COMMENT '设置分类',
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_setting_key\` (\`setting_key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤系统设置表';"
    
    execute_sql "$attendance_settings_sql" "创建考勤设置表" || return 1
    
    # 4. 月度考勤汇总表
    local monthly_summary_sql="
CREATE TABLE IF NOT EXISTS \`monthly_attendance_summary\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`employee_id\` int(11) NOT NULL COMMENT '员工ID',
  \`year\` int(4) NOT NULL COMMENT '年份',
  \`month\` int(2) NOT NULL COMMENT '月份',
  
  -- 工作统计
  \`work_days\` int(3) DEFAULT 0 COMMENT '出勤天数',
  \`total_work_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '总工作小时',
  \`standard_work_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '标准工作小时',
  
  -- 请假统计
  \`total_leave_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '总请假小时',
  \`sick_leave_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '病假小时',
  \`personal_leave_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '事假小时',
  \`annual_leave_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '年假小时',
  \`compensatory_leave_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '调休小时',
  
  -- 其他统计
  \`total_overtime_hours\` decimal(8,2) DEFAULT 0.00 COMMENT '总加班小时',
  \`absent_days\` int(3) DEFAULT 0 COMMENT '缺勤天数',
  \`attendance_rate\` decimal(5,2) DEFAULT 0.00 COMMENT '出勤率(%)',
  
  -- 元数据
  \`calculated_at\` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT '计算时间',
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_employee_year_month\` (\`employee_id\`, \`year\`, \`month\`),
  KEY \`idx_year_month\` (\`year\`, \`month\`),
  KEY \`idx_attendance_rate\` (\`attendance_rate\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月度考勤汇总表';"
    
    execute_sql "$monthly_summary_sql" "创建月度考勤汇总表" || return 1
    
    # 5. 考勤审批流程表
    local attendance_approvals_sql="
CREATE TABLE IF NOT EXISTS \`attendance_approvals\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`attendance_exception_id\` int(11) NOT NULL COMMENT '考勤异常记录ID',
  \`approver_id\` int(11) NOT NULL COMMENT '审批人ID',
  \`status\` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT '审批状态',
  \`approval_reason\` text DEFAULT NULL COMMENT '审批意见',
  \`approved_at\` timestamp NULL DEFAULT NULL COMMENT '审批时间',
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (\`id\`),
  KEY \`idx_attendance_exception\` (\`attendance_exception_id\`),
  KEY \`idx_approver\` (\`approver_id\`),
  KEY \`idx_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='考勤审批流程表';"
    
    execute_sql "$attendance_approvals_sql" "创建考勤审批流程表" || return 1
    
    # 6. 年假余额表
    local annual_leave_sql="
CREATE TABLE IF NOT EXISTS \`annual_leave_balance\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`employee_id\` int(11) NOT NULL COMMENT '员工ID',
  \`year\` int(4) NOT NULL COMMENT '年份',
  \`total_hours\` decimal(6,2) DEFAULT 0.00 COMMENT '年假总小时数',
  \`used_hours\` decimal(6,2) DEFAULT 0.00 COMMENT '已使用小时数',
  \`remaining_hours\` decimal(6,2) DEFAULT 0.00 COMMENT '剩余小时数',
  \`carried_over_hours\` decimal(6,2) DEFAULT 0.00 COMMENT '从上年结转小时数',
  \`expired_hours\` decimal(6,2) DEFAULT 0.00 COMMENT '过期小时数',
  
  \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_employee_year\` (\`employee_id\`, \`year\`),
  KEY \`idx_year\` (\`year\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='年假余额表';"
    
    execute_sql "$annual_leave_sql" "创建年假余额表" || return 1
    
    log "所有考勤表创建完成"
    return 0
}

# 添加外键约束
add_foreign_keys() {
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${BLUE}=== 添加外键约束 ===${NC}"
        echo "-- 检查 users 表是否存在后添加外键"
        return 0
    fi
    
    log "检查并添加外键约束..."
    
    # 检查 users 表是否存在
    local users_exists
    users_exists=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='users';" --skip-column-names --silent)
    
    if [[ -n "$users_exists" ]]; then
        log "添加外键约束到 users 表..."
        
        # 添加外键约束
        local fk_sql="
ALTER TABLE \`attendance_exceptions\` 
ADD CONSTRAINT \`fk_attendance_exceptions_employee\` 
FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE,
ADD CONSTRAINT \`fk_attendance_exceptions_creator\` 
FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`);

ALTER TABLE \`attendance_approvals\` 
ADD CONSTRAINT \`fk_approvals_exception\` 
FOREIGN KEY (\`attendance_exception_id\`) REFERENCES \`attendance_exceptions\` (\`id\`) ON DELETE CASCADE,
ADD CONSTRAINT \`fk_approvals_approver\` 
FOREIGN KEY (\`approver_id\`) REFERENCES \`users\` (\`id\`);

ALTER TABLE \`monthly_attendance_summary\`
ADD CONSTRAINT \`fk_monthly_summary_employee\` 
FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE;

ALTER TABLE \`annual_leave_balance\`
ADD CONSTRAINT \`fk_annual_leave_employee\` 
FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE;"
        
        execute_sql "$fk_sql" "添加外键约束" || return 1
        
    else
        warn "users 表不存在，跳过相关外键约束的创建"
        log "稍后可以手动添加外键约束"
    fi
    
    return 0
}

# 插入默认设置
insert_default_settings() {
    log "插入默认考勤设置..."
    
    local settings_sql="
INSERT INTO \`attendance_settings\` (\`setting_key\`, \`setting_value\`, \`description\`, \`category\`) VALUES 
('work_days_per_week', '5', '每周工作天数', 'schedule'),
('daily_work_hours', '8.00', '每日标准工作小时', 'schedule'),
('work_start_time', '09:00', '标准上班时间', 'schedule'),
('work_end_time', '18:00', '标准下班时间', 'schedule'),
('lunch_break_hours', '1.00', '午休时长(小时)', 'schedule'),
('annual_leave_days', '5', '年假天数', 'leave'),
('sick_leave_days', '10', '病假天数', 'leave'),
('max_overtime_hours_per_day', '4.00', '每日最大加班小时', 'overtime'),
('require_approval', 'true', '是否需要审批', 'approval'),
('auto_calculate_summary', 'true', '是否自动计算月度汇总', 'system')
ON DUPLICATE KEY UPDATE 
  \`setting_value\` = VALUES(\`setting_value\`),
  \`updated_at\` = CURRENT_TIMESTAMP;"
    
    execute_sql "$settings_sql" "插入默认考勤设置" || return 1
    
    return 0
}

# 创建优化索引
create_indexes() {
    log "创建性能优化索引..."
    
    local indexes_sql="
ALTER TABLE \`attendance_exceptions\` 
ADD INDEX \`idx_employee_date_range\` (\`employee_id\`, \`date\`),
ADD INDEX \`idx_date_range\` (\`date\`, \`exception_type\`),
ADD INDEX \`idx_leave_type_date\` (\`leave_type\`, \`date\`);

ALTER TABLE \`monthly_attendance_summary\`
ADD INDEX \`idx_year_month_employee\` (\`year\`, \`month\`, \`employee_id\`);"
    
    execute_sql "$indexes_sql" "创建性能优化索引" || return 1
    
    return 0
}

# 验证表创建结果
verify_tables() {
    log "验证表创建结果..."
    
    local tables=("employees" "attendance_exceptions" "attendance_settings" "monthly_attendance_summary" "attendance_approvals" "annual_leave_balance")
    local created_tables=()
    local failed_tables=()
    
    for table in "${tables[@]}"; do
        local table_exists
        table_exists=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='$table';" --skip-column-names --silent)
        
        if [[ -n "$table_exists" ]]; then
            created_tables+=("$table")
        else
            failed_tables+=("$table")
        fi
    done
    
    echo ""
    echo -e "${GREEN}=== 表创建结果 ===${NC}"
    echo -e "${GREEN}成功创建的表 (${#created_tables[@]}/6):${NC}"
    for table in "${created_tables[@]}"; do
        echo -e "  ${GREEN}✓${NC} $table"
    done
    
    if [[ ${#failed_tables[@]} -gt 0 ]]; then
        echo -e "${RED}创建失败的表:${NC}"
        for table in "${failed_tables[@]}"; do
            echo -e "  ${RED}✗${NC} $table"
        done
        return 1
    fi
    
    echo ""
    log "所有考勤管理系统表创建成功！"
    return 0
}

# 显示使用说明
show_usage_info() {
    echo ""
    echo -e "${BLUE}=== 使用说明 ===${NC}"
    echo "1. 考勤系统采用'默认出勤+异常记录'模式"
    echo "2. 员工默认每天都是出勤状态，只需记录异常情况"
    echo "3. 支持的异常类型：请假(leave)、缺勤(absent)、加班(overtime)"
    echo "4. 请假支持：全天、半天、按小时三种时长类型"
    echo ""
    echo -e "${BLUE}=== 后续步骤 ===${NC}"
    echo "1. 在员工信息表中添加员工数据"
    echo "2. 根据需要调整考勤设置"
    echo "3. 开始记录考勤异常情况"
    echo ""
}

# 主函数
main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -H|--host)
                DB_HOST="$2"
                shift 2
                ;;
            -P|--port)
                DB_PORT="$2"
                shift 2
                ;;
            -d|--database)
                DB_NAME="$2"
                shift 2
                ;;
            -u|--user)
                DB_USER="$2"
                shift 2
                ;;
            -p|--password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --backup)
                BACKUP="true"
                shift
                ;;
            *)
                error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 设置默认值
    DB_HOST=${DB_HOST:-$DEFAULT_DB_HOST}
    DB_PORT=${DB_PORT:-$DEFAULT_DB_PORT}
    DB_NAME=${DB_NAME:-$DEFAULT_DB_NAME}
    DB_USER=${DB_USER:-$DEFAULT_DB_USER}
    DRY_RUN=${DRY_RUN:-false}
    BACKUP=${BACKUP:-false}
    
    # 如果没有提供密码，提示输入
    if [[ -z "$DB_PASSWORD" ]]; then
        read -s -p "请输入数据库密码: " DB_PASSWORD
        echo ""
    fi
    
    echo -e "${BLUE}考勤管理系统数据库表创建脚本${NC}"
    echo "数据库主机: $DB_HOST:$DB_PORT"
    echo "数据库名称: $DB_NAME"
    echo "数据库用户: $DB_USER"
    echo "模式: $([ "$DRY_RUN" = "true" ] && echo "预览模式" || echo "执行模式")"
    echo "备份: $([ "$BACKUP" = "true" ] && echo "是" || echo "否")"
    echo ""
    
    if [[ "$DRY_RUN" != "true" ]]; then
        read -p "确认继续？(y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "操作已取消"
            exit 0
        fi
        echo ""
    fi
    
    # 执行主要步骤
    if [[ "$DRY_RUN" != "true" ]]; then
        check_mysql_connection || exit 1
        check_database_exists || exit 1
        check_existing_tables
        backup_tables
    fi
    
    create_attendance_tables || exit 1
    
    if [[ "$DRY_RUN" != "true" ]]; then
        add_foreign_keys || exit 1
        insert_default_settings || exit 1
        create_indexes || exit 1
        verify_tables || exit 1
        show_usage_info
    fi
    
    log "脚本执行完成！"
}

# 运行主函数
main "$@"
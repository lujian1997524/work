// 模型导入
const User = require('./User');
const Worker = require('./Worker');
const Department = require('./Department');
const Project = require('./Project');
const Material = require('./Material');
const Drawing = require('./Drawing');
const ThicknessSpec = require('./ThicknessSpec');
const OperationHistory = require('./OperationHistory');

// 定义模型关联关系

// User 关联
User.hasMany(Project, {
  foreignKey: 'createdBy',
  as: 'createdProjects'
});

User.hasMany(Drawing, {
  foreignKey: 'uploadedBy',
  as: 'uploadedDrawings'
});

User.hasMany(Project, {
  foreignKey: 'deletedBy',
  as: 'deletedProjects'
});

User.hasMany(Project, {
  foreignKey: 'movedToPastBy',
  as: 'pastProjects'
});

// Worker 关联
Worker.hasMany(Project, {
  foreignKey: 'assignedWorkerId',
  as: 'assignedProjects'
});

Worker.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'departmentInfo'
});

// Department 关联
Department.hasMany(Worker, {
  foreignKey: 'departmentId',
  as: 'workers'
});

User.hasMany(Material, {
  foreignKey: 'completedBy',
  as: 'completedMaterials'
});

// Project 关联
Project.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

Project.belongsTo(Worker, {
  foreignKey: 'assignedWorkerId',
  as: 'assignedWorker'
});

// 删除和过往项目操作人关联
Project.belongsTo(User, {
  foreignKey: 'deletedBy',
  as: 'deleter'
});

Project.belongsTo(User, {
  foreignKey: 'movedToPastBy',
  as: 'pastProjectMover'
});

Project.hasMany(Material, {
  foreignKey: 'projectId',
  as: 'materials',
  onDelete: 'CASCADE'
});

Project.hasMany(Drawing, {
  foreignKey: 'projectId',
  as: 'drawings',
  onDelete: 'CASCADE'
});

// Material 关联
Material.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project'
});

Material.belongsTo(ThicknessSpec, {
  foreignKey: 'thicknessSpecId',
  as: 'thicknessSpec'
});

Material.belongsTo(User, {
  foreignKey: 'completedBy',
  as: 'completedByUser'
});

// Drawing 关联
Drawing.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project'
});

Drawing.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader'
});

// ThicknessSpec 关联
ThicknessSpec.hasMany(Material, {
  foreignKey: 'thicknessSpecId',
  as: 'materials'
});

// OperationHistory 关联
OperationHistory.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project'
});

OperationHistory.belongsTo(User, {
  foreignKey: 'operatedBy',
  as: 'operator'
});

Project.hasMany(OperationHistory, {
  foreignKey: 'projectId',
  as: 'operationHistory',
  onDelete: 'CASCADE'
});

User.hasMany(OperationHistory, {
  foreignKey: 'operatedBy',
  as: 'operationHistory'
});

// 导出所有模型
module.exports = {
  User,
  Worker,
  Department,
  Project,
  Material,
  Drawing,
  ThicknessSpec,
  OperationHistory
};
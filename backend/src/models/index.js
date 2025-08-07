// 模型导入
const User = require('./User');
const Worker = require('./Worker');
const Department = require('./Department');
const Project = require('./Project');
const Material = require('./Material');
const Drawing = require('./Drawing');
const ThicknessSpec = require('./ThicknessSpec');
const OperationHistory = require('./OperationHistory');
const WorkerMaterial = require('./WorkerMaterial');
const MaterialDimension = require('./MaterialDimension');
const MaterialRequirement = require('./MaterialRequirement');
const MaterialAllocation = require('./MaterialAllocation');

// 导入sequelize实例
const { sequelize } = require('../utils/database');

// 初始化MaterialDimension模型 (其他模型已经定义好了)
MaterialDimension.init(sequelize);

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

Material.belongsTo(WorkerMaterial, {
  foreignKey: 'assignedFromWorkerMaterialId',
  as: 'sourceWorkerMaterial'
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

// WorkerMaterial 关联
Worker.hasMany(WorkerMaterial, {
  foreignKey: 'workerId',
  as: 'materials'
});

WorkerMaterial.belongsTo(Worker, {
  foreignKey: 'workerId',
  as: 'worker'
});

WorkerMaterial.belongsTo(ThicknessSpec, {
  foreignKey: 'thicknessSpecId',
  as: 'thicknessSpec'
});

ThicknessSpec.hasMany(WorkerMaterial, {
  foreignKey: 'thicknessSpecId',
  as: 'workerMaterials'
});

// MaterialDimension 关联
WorkerMaterial.hasMany(MaterialDimension, {
  foreignKey: 'workerMaterialId',
  as: 'dimensions'
});

MaterialDimension.belongsTo(WorkerMaterial, {
  foreignKey: 'workerMaterialId',
  as: 'workerMaterial'
});

// MaterialRequirement 关联
Project.hasMany(MaterialRequirement, {
  foreignKey: 'projectId',
  as: 'materialRequirements'
});

MaterialRequirement.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project'
});

MaterialRequirement.belongsTo(Material, {
  foreignKey: 'materialId',
  as: 'material'
});

Material.hasMany(MaterialRequirement, {
  foreignKey: 'materialId',
  as: 'requirements'
});

MaterialRequirement.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// MaterialAllocation 关联
MaterialRequirement.hasMany(MaterialAllocation, {
  foreignKey: 'requirementId',
  as: 'allocations'
});

MaterialAllocation.belongsTo(MaterialRequirement, {
  foreignKey: 'requirementId',
  as: 'requirement'
});

MaterialAllocation.belongsTo(Worker, {
  foreignKey: 'fromWorkerId',
  as: 'fromWorker'
});

MaterialAllocation.belongsTo(Worker, {
  foreignKey: 'toWorkerId',
  as: 'toWorker'
});

MaterialAllocation.belongsTo(WorkerMaterial, {
  foreignKey: 'workerMaterialId',
  as: 'workerMaterial'
});

MaterialAllocation.belongsTo(User, {
  foreignKey: 'allocatedBy',
  as: 'allocator'
});

Worker.hasMany(MaterialAllocation, {
  foreignKey: 'fromWorkerId',
  as: 'lentAllocations'
});

Worker.hasMany(MaterialAllocation, {
  foreignKey: 'toWorkerId',
  as: 'receivedAllocations'
});

WorkerMaterial.hasMany(MaterialAllocation, {
  foreignKey: 'workerMaterialId',
  as: 'allocations'
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
  OperationHistory,
  WorkerMaterial,
  MaterialDimension,
  MaterialRequirement,
  MaterialAllocation,
  sequelize
};
-- 临时解决方案：注释Material模型中的assignedFromWorkerMaterialId字段
-- 这样可以让系统先运行起来

-- 请在 /Users/gao/Desktop/work/backend/src/models/Material.js 文件中
-- 将第64-73行注释掉：

/*
  assignedFromWorkerMaterialId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assigned_from_worker_material_id',
    comment: '来源工人材料ID',
    references: {
      model: 'worker_materials',
      key: 'id'
    }
  },
*/

-- 这样系统就不会尝试查询不存在的字段了
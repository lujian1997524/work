const { Model, DataTypes } = require('sequelize');

class MaterialDimension extends Model {
  static init(sequelize) {
    super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      workerMaterialId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'worker_material_id',
        references: {
          model: 'worker_materials',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      width: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: '宽度（mm）'
      },
      height: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: '长度（mm）'
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '该尺寸数量（张）'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注（批次、供应商、质量等级等）'
      }
    }, {
      sequelize,
      modelName: 'MaterialDimension',
      tableName: 'material_dimensions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
      comment: '板材尺寸详情表'
    });

    return this;
  }

  static associate(models) {
    // 属于某个工人板材记录
    this.belongsTo(models.WorkerMaterial, {
      foreignKey: 'workerMaterialId',
      as: 'workerMaterial'
    });
  }

  // 实例方法：格式化尺寸显示
  getDimensionLabel() {
    return `${this.width}×${this.height}mm`;
  }

  // 静态方法：验证尺寸数据
  static validateDimensionData(dimensionData) {
    const errors = [];
    
    if (!dimensionData.width || dimensionData.width <= 0) {
      errors.push('宽度必须大于0');
    }
    
    if (!dimensionData.height || dimensionData.height <= 0) {
      errors.push('长度必须大于0');
    }
    
    if (!dimensionData.quantity || dimensionData.quantity <= 0) {
      errors.push('数量必须大于0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 静态方法：按工人板材记录统计尺寸
  static async getDimensionsByWorkerMaterial(workerMaterialId) {
    return await this.findAll({
      where: { workerMaterialId },
      order: [['width', 'ASC'], ['height', 'ASC']],
      raw: false
    });
  }

  // 静态方法：计算总数量
  static async calculateTotalQuantity(workerMaterialId) {
    const result = await this.sum('quantity', {
      where: { workerMaterialId }
    });
    return result || 0;
  }
}

module.exports = MaterialDimension;
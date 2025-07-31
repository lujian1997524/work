const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const MaterialBorrowing = sequelize.define('MaterialBorrowing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  borrowerWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'borrower_worker_id',
    comment: '借用人ID',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  lenderWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lender_worker_id',
    comment: '出借人ID',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  materialInventoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'material_inventory_id',
    comment: '借用的库存ID',
    references: {
      model: 'material_inventory',
      key: 'id'
    }
  },
  borrowedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'borrowed_quantity',
    comment: '借用数量'
  },
  borrowDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'borrow_date',
    comment: '借用日期'
  },
  expectedReturnDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expected_return_date',
    comment: '预计归还日期'
  },
  actualReturnDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'actual_return_date',
    comment: '实际归还日期'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'borrowed', 'returned'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '状态：pending-待审批, approved-已批准, rejected-已拒绝, borrowed-已借出, returned-已归还'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '借用原因'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
    comment: '拒绝原因'
  },
  returnedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'returned_quantity',
    comment: '归还数量'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    comment: '审批人ID',
    references: {
      model: 'workers',
      key: 'id'
    }
  },
  approvedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'approved_date',
    comment: '审批日期'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'material_borrowing',
  comment: '借用记录表',
  indexes: [
    {
      fields: ['borrower_worker_id']
    },
    {
      fields: ['lender_worker_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['borrow_date']
    }
  ]
});

module.exports = MaterialBorrowing;
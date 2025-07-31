const { DataTypes } = require('sequelize');
const { sequelize } = require('../utils/database');

const Drawing = sequelize.define('Drawing', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: true, // 改为允许空值，支持图纸库中的未关联图纸
    field: 'project_id',
    comment: '项目ID',
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '文件名'
  },
  originalFilename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_filename',
    comment: '原始文件名'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path',
    comment: '文件路径'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
    comment: '文件大小'
  },
  fileType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'file_type',
    comment: '文件类型'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '版本号'
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'uploaded_by',
    comment: '上传人',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  uploadTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'upload_time',
    comment: '上传时间'
  },
  isCurrentVersion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_current_version',
    comment: '是否当前版本'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '图纸描述'
  },
  status: {
    type: DataTypes.ENUM('可用', '已废弃', '已归档'),
    allowNull: false,
    defaultValue: '可用',
    comment: '图纸状态'
  },
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'archived_at',
    comment: '归档时间'
  },
  isCommonPart: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_common_part',
    comment: '是否为常用零件图纸'
  }
}, {
  tableName: 'drawings',
  comment: '图纸表',
  indexes: [
    {
      fields: ['project_id']
    },
    {
      fields: ['filename']
    },
    {
      fields: ['uploaded_by']
    },
    {
      fields: ['is_current_version']
    }
  ]
});

module.exports = Drawing;
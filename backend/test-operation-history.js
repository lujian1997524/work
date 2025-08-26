const { OperationHistory, User, Project, sequelize } = require('./src/models');
const { Op } = require('sequelize');

async function testQuery() {
  try {
    // 先测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    console.log('=== 测试1: 基本查询（无关联） ===');
    const basicQuery = await OperationHistory.findAll({
      limit: 5,
      order: [['created_at', 'DESC']]
    });
    console.log('基本查询成功，记录数:', basicQuery.length);
    if (basicQuery.length > 0) {
      console.log('第一条记录字段:', Object.keys(basicQuery[0].dataValues));
      console.log('created_at值:', basicQuery[0].dataValues.created_at);
    }

    console.log('\n=== 测试2: 带project关联查询 ===');
    const projectQuery = await OperationHistory.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      limit: 5,
      order: [['created_at', 'DESC']]
    });
    console.log('带project关联查询成功，记录数:', projectQuery.length);

    console.log('\n=== 测试3: 带operator关联查询 ===');
    const operatorQuery = await OperationHistory.findAll({
      include: [
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      limit: 5,
      order: [['created_at', 'DESC']]
    });
    console.log('带operator关联查询成功，记录数:', operatorQuery.length);

    console.log('\n=== 测试4: 完整查询（和API相同） ===');
    const whereClause = {
      created_at: {
        [Op.gte]: new Date('2025-08-23T16:00:00.000Z')
      }
    };

    const fullQuery = await OperationHistory.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 20,
      offset: 0
    });
    console.log('完整查询成功，记录数:', fullQuery.length);

    console.log('\n=== 所有测试通过 ===');
    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('查询失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      sql: error.sql || '无SQL信息'
    });
    await sequelize.close();
    process.exit(1);
  }
}

testQuery();
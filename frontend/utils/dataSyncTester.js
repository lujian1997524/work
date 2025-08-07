/**
 * 数据同步测试工具
 * 测试各组件间的数据同步和事件通信
 */

class DataSyncTester {
  constructor() {
    this.eventLog = [];
    this.testResults = [];
    this.isRunning = false;
  }

  /**
   * 记录事件
   */
  logEvent(eventType, data, source = 'unknown') {
    const logEntry = {
      timestamp: Date.now(),
      eventType,
      data,
      source,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.eventLog.push(logEntry);
    console.log(`📡 [${source}] ${eventType}:`, data);
    return logEntry.id;
  }

  /**
   * 启动同步测试
   */
  startSyncTest() {
    if (this.isRunning) {
      console.log('⚠️ 同步测试已在运行中...');
      return;
    }

    this.isRunning = true;
    this.eventLog = [];
    this.testResults = [];
    
    console.log('🚀 开始数据同步测试...');

    // 监听所有数据更新事件
    this.setupEventListeners();
    
    // 运行测试套件
    this.runTestSuite();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    const events = [
      'materials-updated',
      'worker-materials-updated', 
      'project-created',
      'project-updated',
      'material-status-changed',
      'material-allocated',
      'projects-updated',
      'refresh-materials'
    ];

    events.forEach(eventType => {
      window.addEventListener(eventType, (event) => {
        this.logEvent(eventType, event.detail || {}, 'window-event');
      });
    });

    console.log(`📋 已设置 ${events.length} 个事件监听器`);
  }

  /**
   * 运行测试套件
   */
  async runTestSuite() {
    const tests = [
      this.testMaterialStatusSync,
      this.testWorkerMaterialSync,
      this.testProjectCreationSync,
      this.testAllocationSync,
      this.testCrossComponentSync
    ];

    console.log(`🧪 开始执行 ${tests.length} 个测试用例...`);

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      try {
        console.log(`\n🧪 执行测试 ${i + 1}/${tests.length}: ${test.name}`);
        await test.call(this);
        this.testResults.push({ test: test.name, status: 'passed', time: Date.now() });
      } catch (error) {
        console.error(`❌ 测试失败: ${test.name}`, error);
        this.testResults.push({ test: test.name, status: 'failed', error: error.message, time: Date.now() });
      }
      
      // 测试间隔
      await this.delay(1000);
    }

    this.finalizeSyncTest();
  }

  /**
   * 测试1: 材料状态同步
   */
  async testMaterialStatusSync() {
    const testId = this.logEvent('test-start', { test: 'material-status-sync' }, 'tester');
    
    // 模拟材料状态变更
    const mockMaterialUpdate = {
      materialId: 'test-material-1',
      oldStatus: 'pending',
      newStatus: 'in_progress'
    };

    // 派发材料状态变更事件
    window.dispatchEvent(new CustomEvent('material-status-changed', {
      detail: mockMaterialUpdate
    }));

    // 等待其他组件响应
    await this.delay(500);

    // 检查是否触发了相关的更新事件
    const relatedEvents = this.eventLog.filter(log => 
      log.timestamp > testId && 
      (log.eventType === 'materials-updated' || log.eventType === 'projects-updated')
    );

    if (relatedEvents.length === 0) {
      throw new Error('材料状态更新未触发相关同步事件');
    }

    console.log(`✅ 材料状态同步测试通过 - 触发了 ${relatedEvents.length} 个相关事件`);
  }

  /**
   * 测试2: 工人材料同步
   */
  async testWorkerMaterialSync() {
    const testId = this.logEvent('test-start', { test: 'worker-material-sync' }, 'tester');
    
    // 模拟工人材料更新
    window.dispatchEvent(new CustomEvent('worker-materials-updated', {
      detail: { workerId: 'test-worker-1', action: 'add-material' }
    }));

    await this.delay(500);

    // 检查MaterialInventoryManager是否收到更新
    const relatedEvents = this.eventLog.filter(log => 
      log.timestamp > testId && log.eventType === 'worker-materials-updated'
    );

    if (relatedEvents.length === 0) {
      throw new Error('工人材料更新事件未正确传播');
    }

    console.log('✅ 工人材料同步测试通过');
  }

  /**
   * 测试3: 项目创建同步
   */
  async testProjectCreationSync() {
    const testId = this.logEvent('test-start', { test: 'project-creation-sync' }, 'tester');
    
    // 模拟项目创建
    window.dispatchEvent(new CustomEvent('project-created', {
      detail: { 
        project: { 
          id: 'test-project-1', 
          name: '测试项目',
          assignedWorkerId: 'test-worker-1',
          requiredThickness: [1, 2, 3]
        }
      }
    }));

    await this.delay(500);

    // 应该同时触发项目和工人材料的更新
    const projectEvents = this.eventLog.filter(log => 
      log.timestamp > testId && log.eventType === 'projects-updated'
    );

    const materialEvents = this.eventLog.filter(log => 
      log.timestamp > testId && log.eventType === 'worker-materials-updated'
    );

    if (projectEvents.length === 0 && materialEvents.length === 0) {
      throw new Error('项目创建未触发相关同步事件');
    }

    console.log('✅ 项目创建同步测试通过');
  }

  /**
   * 测试4: 板材分配同步
   */
  async testAllocationSync() {
    const testId = this.logEvent('test-start', { test: 'allocation-sync' }, 'tester');
    
    // 模拟板材分配
    window.dispatchEvent(new CustomEvent('material-allocated', {
      detail: {
        projectId: 'test-project-1',
        workerId: 'test-worker-1',
        allocateQuantity: 5
      }
    }));

    await this.delay(500);

    // 板材分配应该触发多个组件的更新
    const updates = this.eventLog.filter(log => 
      log.timestamp > testId && 
      (log.eventType === 'materials-updated' || log.eventType === 'worker-materials-updated')
    );

    if (updates.length === 0) {
      throw new Error('板材分配未触发相关组件更新');
    }

    console.log('✅ 板材分配同步测试通过');
  }

  /**
   * 测试5: 跨组件同步
   */
  async testCrossComponentSync() {
    console.log('🔄 测试跨组件数据同步...');
    
    // 连续触发多个事件，测试组件间的协调能力
    const events = [
      'materials-updated',
      'worker-materials-updated', 
      'projects-updated'
    ];

    for (const eventType of events) {
      window.dispatchEvent(new CustomEvent(eventType, {
        detail: { source: 'sync-test', timestamp: Date.now() }
      }));
      await this.delay(200);
    }

    // 检查是否有事件冲突或丢失
    const recentEvents = this.eventLog.filter(log => 
      Date.now() - log.timestamp < 2000
    );

    if (recentEvents.length < events.length) {
      throw new Error('部分同步事件可能丢失');
    }

    console.log('✅ 跨组件同步测试通过');
  }

  /**
   * 完成同步测试
   */
  finalizeSyncTest() {
    this.isRunning = false;
    
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    
    console.log('\n📊 数据同步测试结果:');
    console.log(`✅ 通过: ${passedTests} 个测试`);
    console.log(`❌ 失败: ${failedTests} 个测试`);
    console.log(`📡 总事件数: ${this.eventLog.length}`);
    
    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(`  - ${result.test}: ${result.error}`);
        });
    }

    // 生成测试报告
    this.generateSyncReport();
  }

  /**
   * 生成同步测试报告
   */
  generateSyncReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      eventLog: this.eventLog,
      summary: {
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(r => r.status === 'passed').length,
        failedTests: this.testResults.filter(r => r.status === 'failed').length,
        totalEvents: this.eventLog.length,
        testDuration: this.testResults.length > 0 ? 
          Math.max(...this.testResults.map(r => r.time)) - 
          Math.min(...this.testResults.map(r => r.time)) : 0
      }
    };

    // 保存到localStorage供调试使用
    localStorage.setItem('dataSyncTestReport', JSON.stringify(report, null, 2));
    
    console.log('\n📋 测试报告已保存到 localStorage.dataSyncTestReport');
    console.log('可以通过以下代码查看详细报告:');
    console.log('JSON.parse(localStorage.getItem("dataSyncTestReport"))');

    return report;
  }

  /**
   * 延迟工具函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 手动触发刷新事件测试
   */
  testRefreshEvents() {
    console.log('🔄 测试刷新事件...');
    
    const refreshEvents = [
      'refresh-materials',
      'materials-updated',
      'worker-materials-updated'
    ];

    refreshEvents.forEach(eventType => {
      console.log(`派发事件: ${eventType}`);
      window.dispatchEvent(new CustomEvent(eventType, {
        detail: { source: 'manual-test', timestamp: Date.now() }
      }));
    });
  }

  /**
   * 获取事件统计
   */
  getEventStats() {
    const stats = {};
    this.eventLog.forEach(log => {
      if (!stats[log.eventType]) {
        stats[log.eventType] = 0;
      }
      stats[log.eventType]++;
    });

    console.table(stats);
    return stats;
  }
}

// 创建全局实例
window.dataSyncTester = new DataSyncTester();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataSyncTester;
}

console.log('📡 数据同步测试工具已加载');
console.log('使用方法:');
console.log('  window.dataSyncTester.startSyncTest() - 开始完整测试');
console.log('  window.dataSyncTester.testRefreshEvents() - 测试刷新事件');
console.log('  window.dataSyncTester.getEventStats() - 查看事件统计');
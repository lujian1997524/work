// 智能提示系统
// 基于业务数据和用户行为提供智能建议和Toast提示

import React from 'react';
import { projectToastHelper } from './projectToastHelper';
import { materialToastHelper } from './materialToastHelper';
import { workerToastHelper } from './workerToastHelper';

// 智能提示类型
export type SmartSuggestionType = 
  | 'workflow-optimization'    // 工作流优化
  | 'efficiency-insight'       // 效率洞察
  | 'bottleneck-detected'      // 瓶颈检测
  | 'skill-match'             // 技能匹配
  | 'timeline-insight'        // 时间线洞察
  | 'pattern-insight'         // 模式洞察
  | 'performance-report'      // 性能报告
  | 'resource-optimization'   // 资源优化
  | 'predictive-maintenance'  // 预测维护
  | 'quality-assurance';      // 质量保证

// 业务数据接口
interface BusinessMetrics {
  // 项目指标
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  averageProjectDuration: number;
  projectCompletionRate: number;
  
  // 工人指标
  totalWorkers: number;
  averageWorkload: number;
  workerEfficiency: { [workerId: number]: number };
  
  // 材料指标
  totalMaterials: number;
  materialUtilizationRate: number;
  carbonMaterialRatio: number;
  
  // 时间指标
  averageResponseTime: number;
  peakWorkingHours: string[];
}

// 智能建议接口
interface SmartSuggestion {
  id: string;
  type: SmartSuggestionType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionable: boolean;
  actions?: SuggestionAction[];
  data?: any;
  timestamp: string;
}

interface SuggestionAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

// 智能提示引擎
class SmartSuggestionEngine {
  private suggestions: SmartSuggestion[] = [];
  private metrics: BusinessMetrics | null = null;
  private isActive = false;
  private analysisInterval: NodeJS.Timeout | null = null;

  // 启动智能提示引擎
  start(initialMetrics?: BusinessMetrics) {
    if (this.isActive) return;
    
    this.isActive = true;
    if (initialMetrics) {
      this.metrics = initialMetrics;
    }
    
    // 定期分析业务数据并生成建议
    this.analysisInterval = setInterval(() => {
      this.analyzeAndSuggest();
    }, 30000); // 每30秒分析一次
    
    // 初始分析
    this.analyzeAndSuggest();
  }

  // 停止智能提示引擎
  stop() {
    this.isActive = false;
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  // 更新业务指标
  updateMetrics(metrics: Partial<BusinessMetrics>) {
    if (!this.metrics) {
      this.metrics = metrics as BusinessMetrics;
    } else {
      this.metrics = { ...this.metrics, ...metrics };
    }
  }

  // 主要分析和建议逻辑
  private analyzeAndSuggest() {
    if (!this.metrics) return;

    this.analyzeWorkflowEfficiency();
    this.analyzeWorkerLoadBalance();
    this.analyzeMaterialStrategy();
    this.analyzeProjectTimelines();
    this.analyzePerformancePatterns();
    this.analyzeResourceOptimization();
  }

  // 分析工作流效率
  private analyzeWorkflowEfficiency() {
    if (!this.metrics) return;
    
    const { projectCompletionRate, averageProjectDuration } = this.metrics;
    
    // 项目完成率低于70%时提醒
    if (projectCompletionRate < 70) {
      this.createSuggestion({
        type: 'workflow-optimization',
        priority: 'high',
        title: '项目完成率偏低',
        message: `当前项目完成率为${projectCompletionRate.toFixed(1)}%，建议优化工作流程`,
        actionable: true,
        actions: [
          {
            label: '查看瓶颈分析',
            action: () => this.showBottleneckAnalysis(),
            primary: true
          },
          {
            label: '优化建议',
            action: () => this.showWorkflowOptimization()
          }
        ]
      });
    }
    
    // 项目平均时长过长时提醒
    if (averageProjectDuration > 30) { // 假设30天为基准
      this.createSuggestion({
        type: 'timeline-insight',
        priority: 'medium',
        title: '项目周期偏长',
        message: `平均项目周期为${averageProjectDuration}天，可考虑提升效率`,
        actionable: true,
        actions: [
          {
            label: '时间线优化',
            action: () => this.showTimelineOptimization(),
            primary: true
          }
        ]
      });
    }
  }

  // 分析工人负载平衡
  private analyzeWorkerLoadBalance() {
    if (!this.metrics) return;
    
    const { workerEfficiency, averageWorkload } = this.metrics;
    
    // 找出效率最高和最低的工人
    const efficiencies = Object.values(workerEfficiency);
    const maxEfficiency = Math.max(...efficiencies);
    const minEfficiency = Math.min(...efficiencies);
    
    // 效率差距过大时提醒
    if (maxEfficiency - minEfficiency > 0.3) {
      this.createSuggestion({
        type: 'skill-match',
        priority: 'medium',
        title: '工人效率差异较大',
        message: '团队成员效率差异显著，建议进行技能培训或任务重新分配',
        actionable: true,
        actions: [
          {
            label: '查看效率报告',
            action: () => this.showEfficiencyReport(),
            primary: true
          },
          {
            label: '技能匹配建议',
            action: () => this.showSkillMatching()
          }
        ]
      });
    }
  }

  // 分析材料策略
  private analyzeMaterialStrategy() {
    if (!this.metrics) return;
    
    const { carbonMaterialRatio, materialUtilizationRate } = this.metrics;
    
    // 95/5策略偏离检查
    if (carbonMaterialRatio < 90 || carbonMaterialRatio > 98) {
      const priority = Math.abs(carbonMaterialRatio - 95) > 10 ? 'high' : 'medium';
      
      this.createSuggestion({
        type: 'pattern-insight',
        priority,
        title: '材料配比偏离95/5策略',
        message: `当前碳板比例为${carbonMaterialRatio.toFixed(1)}%，偏离95/5优化策略`,
        actionable: true,
        actions: [
          {
            label: '调整材料配比',
            action: () => this.adjustMaterialRatio(),
            primary: true
          },
          {
            label: '查看详细分析',
            action: () => this.showMaterialAnalysis()
          }
        ]
      });
    }
    
    // 材料利用率低时提醒
    if (materialUtilizationRate < 80) {
      this.createSuggestion({
        type: 'resource-optimization',
        priority: 'medium',
        title: '材料利用率偏低',
        message: `材料利用率为${materialUtilizationRate.toFixed(1)}%，存在优化空间`,
        actionable: true,
        actions: [
          {
            label: '优化建议',
            action: () => this.showResourceOptimization(),
            primary: true
          }
        ]
      });
    }
  }

  // 分析项目时间线
  private analyzeProjectTimelines() {
    if (!this.metrics) return;
    
    const { activeProjects, averageResponseTime } = this.metrics;
    
    // 活跃项目过多时提醒
    if (activeProjects > 20) {
      this.createSuggestion({
        type: 'bottleneck-detected',
        priority: 'high',
        title: '活跃项目数量过多',
        message: `当前有${activeProjects}个活跃项目，可能影响整体效率`,
        actionable: true,
        actions: [
          {
            label: '项目优先级管理',
            action: () => this.showProjectPriority(),
            primary: true
          },
          {
            label: '负载均衡建议',
            action: () => this.showLoadBalancing()
          }
        ]
      });
    }
    
    // 响应时间过长时提醒
    if (averageResponseTime > 24) { // 假设24小时为基准
      this.createSuggestion({
        type: 'efficiency-insight',
        priority: 'medium',
        title: '响应时间偏长',
        message: `平均响应时间为${averageResponseTime.toFixed(1)}小时，建议提升响应速度`,
        actionable: true
      });
    }
  }

  // 分析性能模式
  private analyzePerformancePatterns() {
    if (!this.metrics) return;
    
    const { peakWorkingHours } = this.metrics;
    
    // 根据工作高峰时间给出建议
    if (peakWorkingHours.length > 0) {
      this.createSuggestion({
        type: 'performance-report',
        priority: 'low',
        title: '工作模式洞察',
        message: `团队高效工作时段：${peakWorkingHours.join(', ')}，建议合理安排重要任务`,
        actionable: false
      });
    }
  }

  // 分析资源优化
  private analyzeResourceOptimization() {
    // 可以添加更多资源优化分析逻辑
    // 例如：设备利用率、空间利用率等
  }

  // 创建建议
  private createSuggestion(suggestion: Omit<SmartSuggestion, 'id' | 'timestamp'>) {
    const newSuggestion: SmartSuggestion = {
      ...suggestion,
      id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // 避免重复建议
    const existingSuggestion = this.suggestions.find(s => 
      s.type === newSuggestion.type && s.title === newSuggestion.title
    );
    
    if (existingSuggestion) return;

    this.suggestions.push(newSuggestion);
    this.showSuggestion(newSuggestion);
    
    // 限制建议数量，保留最近的50个
    if (this.suggestions.length > 50) {
      this.suggestions = this.suggestions.slice(-50);
    }
  }

  // 显示建议Toast
  private showSuggestion(suggestion: SmartSuggestion) {
    const toastType = this.getToastType(suggestion.type);
    
    // 根据建议类型选择合适的Toast helper
    switch (suggestion.type) {
      case 'workflow-optimization':
      case 'timeline-insight':
      case 'bottleneck-detected':
        projectToastHelper.info(`💡 ${suggestion.title}: ${suggestion.message}`);
        break;
      
      case 'skill-match':
      case 'efficiency-insight':
      case 'performance-report':
        workerToastHelper.info(`📊 ${suggestion.title}: ${suggestion.message}`);
        break;
      
      case 'pattern-insight':
      case 'resource-optimization':
        materialToastHelper.batchOperationComplete(`🔍 ${suggestion.title}: ${suggestion.message}`);
        break;
      
      default:
        projectToastHelper.info(`🤖 ${suggestion.title}: ${suggestion.message}`);
    }
  }

  private getToastType(suggestionType: SmartSuggestionType): string {
    switch (suggestionType) {
      case 'bottleneck-detected': return 'bottleneck-detected';
      case 'efficiency-insight': return 'efficiency-insight';
      case 'skill-match': return 'skill-match';
      case 'timeline-insight': return 'timeline-insight';
      case 'pattern-insight': return 'pattern-insight';
      case 'performance-report': return 'performance-report';
      case 'workflow-optimization': return 'workflow-optimization';
      default: return 'smart-suggestion';
    }
  }

  // 建议操作方法（示例实现）
  private showBottleneckAnalysis() {
    projectToastHelper.info('正在分析项目瓶颈...');
  }

  private showWorkflowOptimization() {
    projectToastHelper.info('工作流优化建议已生成');
  }

  private showTimelineOptimization() {
    projectToastHelper.info('时间线优化方案已准备');
  }

  private showEfficiencyReport() {
    workerToastHelper.info('团队效率报告已生成');
  }

  private showSkillMatching() {
    workerToastHelper.info('技能匹配建议已更新');
  }

  private adjustMaterialRatio() {
    materialToastHelper.strategyDeviation(this.metrics?.carbonMaterialRatio || 0, 95);
  }

  private showMaterialAnalysis() {
    materialToastHelper.batchOperationComplete('材料分析报告已生成');
  }

  private showResourceOptimization() {
    materialToastHelper.batchOperationComplete('资源优化方案已准备');
  }

  private showProjectPriority() {
    projectToastHelper.info('项目优先级管理界面已打开');
  }

  private showLoadBalancing() {
    projectToastHelper.info('负载均衡建议已更新');
  }

  // 公共方法
  getSuggestions(): SmartSuggestion[] {
    return [...this.suggestions];
  }

  clearSuggestions() {
    this.suggestions = [];
  }

  isRunning(): boolean {
    return this.isActive;
  }
}

// 创建全局智能提示引擎实例
export const smartSuggestionEngine = new SmartSuggestionEngine();

// React Hook：使用智能提示功能
export const useSmartSuggestions = (options?: {
  autoStart?: boolean;
  metricsUpdateInterval?: number;
}) => {
  const { autoStart = true, metricsUpdateInterval = 60000 } = options || {};

  React.useEffect(() => {
    if (autoStart) {
      smartSuggestionEngine.start();
    }

    return () => {
      if (autoStart) {
        smartSuggestionEngine.stop();
      }
    };
  }, [autoStart]);

  return {
    isRunning: smartSuggestionEngine.isRunning(),
    start: (metrics?: BusinessMetrics) => smartSuggestionEngine.start(metrics),
    stop: () => smartSuggestionEngine.stop(),
    updateMetrics: (metrics: Partial<BusinessMetrics>) => smartSuggestionEngine.updateMetrics(metrics),
    getSuggestions: () => smartSuggestionEngine.getSuggestions(),
    clearSuggestions: () => smartSuggestionEngine.clearSuggestions(),
  };
};

// 扩展Toast辅助函数以支持info方法
declare module './projectToastHelper' {
  interface ProjectToastHelper {
    info: (message: string) => void;
  }
}

declare module './workerToastHelper' {
  interface WorkerToastHelper {
    info: (message: string) => void;
  }
}
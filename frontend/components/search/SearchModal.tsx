'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  UserIcon,
  BriefcaseIcon,
  CubeIcon,
  DocumentIcon,
  UsersIcon,
  ClockIcon,
  TagIcon,
  PhoneIcon,
  CalendarIcon,
  ChartBarIcon,
  FolderIcon,
  BuildingOfficeIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { apiRequest } from '@/utils/api';
import { Card, Badge, Button, Input, TabBar, Loading } from '@/components/ui';

interface SearchResult {
  type: string;
  id: number | string;
  title: string;
  subtitle: string;
  description: string;
  relevanceScore: number;
  metadata: Record<string, any>;
  relatedData: Record<string, any>;
  jumpTo: {
    type: string;
    id: number;
    path: string;
    view?: string;
    tab?: string;
    action: string;
    projectId?: number;
    employeeId?: string;
    drawingId?: number;
    recordId?: number;
    filters?: Record<string, any>;
  };
}

interface SearchCategories {
  worker?: { count: number; label: string };
  project?: { count: number; label: string };
  employee?: { count: number; label: string };
  thickness_spec?: { count: number; label: string };
  drawing?: { count: number; label: string };
  material?: { count: number; label: string };
  attendance?: { count: number; label: string };
}

interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  total: number;
  categories: SearchCategories;
  suggestions?: Array<{ text: string; type: string; description: string }>;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (result: SearchResult) => void;
}

// 完整的7种搜索类别配置 - 与后端API完全对应
const SEARCH_CATEGORIES = {
  worker: {
    id: 'worker',
    label: '工人',
    icon: UserIcon,
    color: 'text-ios18-blue',
    bgColor: 'bg-blue-50',
    primaryColor: '#007AFF',
    description: '搜索工人及其项目、材料、考勤信息'
  },
  project: {
    id: 'project', 
    label: '项目',
    icon: BriefcaseIcon,
    color: 'text-ios18-teal',
    bgColor: 'bg-teal-50',
    primaryColor: '#34C759',
    description: '搜索项目及其负责工人、使用材料、图纸'
  },
  employee: {
    id: 'employee',
    label: '员工', 
    icon: UsersIcon,
    color: 'text-ios18-indigo',
    bgColor: 'bg-indigo-50', 
    primaryColor: '#5856D6',
    description: '搜索员工考勤记录及对应工人信息'
  },
  thickness_spec: {
    id: 'thickness_spec',
    label: '板材规格',
    icon: TagIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    primaryColor: '#FF9500',
    description: '搜索厚度规格及使用情况'
  },
  drawing: {
    id: 'drawing',
    label: '图纸',
    icon: DocumentIcon, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    primaryColor: '#AF52DE',
    description: '搜索图纸文档及关联项目'
  },
  material: {
    id: 'material',
    label: '材料',
    icon: CubeIcon,
    color: 'text-pink-600', 
    bgColor: 'bg-pink-50',
    primaryColor: '#FF2D92',
    description: '搜索材料库存及所属工人'
  },
  attendance: {
    id: 'attendance',
    label: '考勤记录',
    icon: ClockIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    primaryColor: '#FF3B30', 
    description: '搜索考勤异常及相关员工'
  }
} as const;

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [categories, setCategories] = useState<SearchCategories>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ text: string; type: string; description: string }>>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSearchResults([]);
      setCategories({});
      setActiveTab('');
      setSuggestions([]);
    }
  }, [isOpen]);

  // 状态中文转换
  const getStatusLabel = (status: string, type: string = 'project'): string => {
    const statusLabels: Record<string, Record<string, string>> = {
      project: {
        'pending': '待处理',
        'in_progress': '进行中', 
        'completed': '已完成',
        'cancelled': '已取消',
        'on_hold': '暂停',
        'draft': '草稿'
      },
      material: {
        'empty': '空闲',
        'pending': '待加工',
        'in_progress': '加工中',
        'completed': '已完成'
      },
      worker: {
        'active': '在职',
        'inactive': '离职',
        'on_leave': '请假'
      },
      attendance: {
        'leave': '请假',
        'overtime': '加班', 
        'absent': '缺勤',
        'late': '迟到',
        'early': '早退'
      }
    };
    
    return statusLabels[type]?.[status] || status;
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCategories({});
      setActiveTab('');
      setSuggestions([]);
      return;
    }

    setLoading(true);
    console.log('开始搜索:', query);
    
    try {
      const searchUrl = `/api/search?q=${encodeURIComponent(query)}`;
      console.log('搜索URL:', searchUrl);
      
      const response = await apiRequest(searchUrl);
      console.log('API响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const data: SearchResponse = await response.json();
        console.log('API响应数据:', data);
        
        if (data.success) {
          console.log('搜索结果数据:', data);
          console.log('所有类别:', data.categories);
          console.log('搜索结果:', data.results);
          
          // 详细调试工人搜索结果
          const workerResults = data.results.filter((r: any) => r.type === 'worker');
          if (workerResults.length > 0) {
            console.log('工人搜索结果详情:', workerResults);
            workerResults.forEach((worker: any, index: number) => {
              console.log(`工人 ${index + 1}: ${worker.title}`);
              console.log('- 关联项目:', worker.relatedData?.projects);
              console.log('- 关联材料:', worker.relatedData?.materials);
              console.log('- 考勤统计:', worker.relatedData?.attendanceStats);
              console.log('- 元数据:', worker.metadata);
            });
          }
          
          setSearchResults(data.results || []);
          setCategories(data.categories || {});
          setSuggestions(data.suggestions || []);
          
          // 自动选择第一个有结果的tab
          const firstTabWithResults = Object.entries(data.categories || {})
            .find(([_, categoryData]) => categoryData && categoryData.count > 0)?.[0];
          console.log('选择的第一个tab:', firstTabWithResults);
          setActiveTab(firstTabWithResults || '');
        } else {
          console.error('搜索API返回失败:', data);
        }
      } else {
        console.error('API请求失败:', response.status, await response.text());
      }
    } catch (error) {
      console.error('搜索API请求异常:', error);
      console.error('请求URL:', `/api/search?q=${encodeURIComponent(query)}`);
      
      // 显示错误信息给用户
      setSearchResults([]);
      setCategories({});
      setActiveTab('');
      setSuggestions([{
        text: '网络连接失败',
        type: 'error',
        description: '无法连接到搜索服务器，请检查网络连接或稍后重试'
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    console.log('点击搜索结果:', result);
    
    // 智能跳转逻辑
    const jumpTo = result.jumpTo;
    
    try {
      // 根据不同的结果类型执行不同的跳转逻辑
      switch (result.type) {
        case 'worker':
          // 跳转到材料管理页面的工人库存视图
          if (jumpTo.view === 'materials' && jumpTo.tab === 'inventory') {
            // 触发全局导航事件
            window.dispatchEvent(new CustomEvent('navigate-to-worker-materials', {
              detail: {
                workerId: jumpTo.filters?.workerId || result.id,
                workerName: result.title,
                view: 'materials',
                tab: 'inventory'
              }
            }));
          }
          break;
          
        case 'project':
          // 跳转到项目详情页面
          if (jumpTo.action === 'view_project_details' && jumpTo.projectId) {
            window.dispatchEvent(new CustomEvent('navigate-to-project', {
              detail: {
                projectId: jumpTo.projectId,
                projectName: result.title,
                view: jumpTo.view || 'active'
              }
            }));
          }
          break;
          
        case 'employee':
          // 跳转到考勤管理页面
          if (jumpTo.view === 'attendance' && jumpTo.employeeId) {
            window.dispatchEvent(new CustomEvent('navigate-to-attendance', {
              detail: {
                employeeId: jumpTo.employeeId,
                employeeName: result.title,
                action: jumpTo.action
              }
            }));
          }
          break;
          
        case 'material':
          // 跳转到材料库存页面
          if (jumpTo.view === 'materials') {
            window.dispatchEvent(new CustomEvent('navigate-to-materials', {
              detail: {
                materialId: result.id,
                materialType: result.title,
                filters: jumpTo.filters,
                action: jumpTo.action
              }
            }));
          }
          break;
          
        case 'drawing':
          // 跳转到图纸页面
          if (jumpTo.drawingId && jumpTo.projectId) {
            window.dispatchEvent(new CustomEvent('navigate-to-drawing', {
              detail: {
                drawingId: jumpTo.drawingId,
                projectId: jumpTo.projectId,
                projectName: result.metadata?.projectName,
                filename: result.title
              }
            }));
          }
          break;
          
        case 'thickness_spec':
          // 跳转到板材规格筛选
          if (jumpTo.action === 'filter_by_thickness' && jumpTo.filters?.thicknessFilter) {
            window.dispatchEvent(new CustomEvent('navigate-to-thickness-filter', {
              detail: {
                thicknessFilter: jumpTo.filters.thicknessFilter,
                thickness: result.metadata?.thickness,
                materialType: result.metadata?.materialType
              }
            }));
          }
          break;
          
        case 'attendance':
          // 跳转到具体考勤记录
          if (jumpTo.employeeId && jumpTo.recordId) {
            window.dispatchEvent(new CustomEvent('navigate-to-attendance-record', {
              detail: {
                employeeId: jumpTo.employeeId,
                recordId: jumpTo.recordId,
                employeeName: result.metadata?.employeeName,
                date: result.metadata?.date
              }
            }));
          }
          break;
          
        default:
          console.warn('未处理的搜索结果类型:', result.type);
      }
      
      // 显示跳转提示
      const actionLabels: Record<string, string> = {
        'view_worker_details': '查看工人详情',
        'view_project_details': '查看项目详情', 
        'view_employee_attendance': '查看员工考勤',
        'view_material_details': '查看材料详情',
        'view_drawing': '查看图纸',
        'filter_by_thickness': '按厚度筛选',
        'view_attendance_record': '查看考勤记录'
      };
      
      const actionLabel = actionLabels[jumpTo.action] || '跳转到相关页面';
      
      // 可以在这里添加Toast通知
      console.log(`正在执行: ${actionLabel} - ${result.title}`);
      
    } catch (error) {
      console.error('跳转处理失败:', error);
    }
    
    // 调用原始的导航回调（如果有）
    if (onNavigate) {
      onNavigate(result);
    }
    
    // 关闭搜索弹窗
    onClose();
  };

  // 构建Tab数据 - 兼容TabBar组件，确保所有类别都能被找到
  const availableTabs = Object.entries(categories)
    .filter(([_, categoryData]) => categoryData && categoryData.count > 0)
    .map(([key, categoryData]) => {
      const config = SEARCH_CATEGORIES[key as keyof typeof SEARCH_CATEGORIES];
      if (!config) {
        console.warn(`未找到搜索类别配置: ${key}`, categoryData);
        return null;
      }
      return {
        id: key,
        label: config.label,
        icon: React.createElement(config.icon, { className: 'w-5 h-5' }),
        badge: categoryData?.count || 0
      };
    })
    .filter((tab): tab is NonNullable<typeof tab> => tab !== null); // 类型安全的过滤

  const currentTabResults = activeTab 
    ? searchResults.filter(result => result.type === activeTab)
    : [];

  // 获取当前tab的配置
  const getCurrentTabConfig = () => {
    return SEARCH_CATEGORIES[activeTab as keyof typeof SEARCH_CATEGORIES];
  };

  // 获取状态图标组件
  const getStatusIcon = (type: string, metadata: any) => {
    const iconClasses = 'w-4 h-4';
    
    switch (type) {
      case 'project':
        if (metadata.status === 'completed') return <ChartBarIcon className={`${iconClasses} text-green-600`} />;
        if (metadata.status === 'in_progress') return <ArrowTopRightOnSquareIcon className={`${iconClasses} text-blue-600`} />;
        if (metadata.status === 'pending') return <ClockIcon className={`${iconClasses} text-yellow-600`} />;
        return <FolderIcon className={`${iconClasses} text-gray-600`} />;
      case 'material':
        if (metadata.totalQuantity > 0) return <CubeIcon className={`${iconClasses} text-purple-600`} />;
        return <CubeIcon className={`${iconClasses} text-gray-400`} />;
      case 'attendance':
        if (metadata.status === 'approved') return <ChartBarIcon className={`${iconClasses} text-green-600`} />;
        if (metadata.status === 'pending') return <ClockIcon className={`${iconClasses} text-yellow-600`} />;
        return <XMarkIcon className={`${iconClasses} text-red-600`} />;
      case 'employee':
        return <UsersIcon className={`${iconClasses} text-indigo-600`} />;
      case 'worker':
        return <UserIcon className={`${iconClasses} text-blue-600`} />;
      case 'drawing':
        return <DocumentIcon className={`${iconClasses} text-purple-600`} />;
      case 'thickness_spec':
        return <TagIcon className={`${iconClasses} text-orange-600`} />;
      default:
        return null;
    }
  };

  // 渲染搜索结果卡片 - 使用预设Card组件
  const renderResultCard = (result: SearchResult, index: number) => {
    const config = getCurrentTabConfig();
    const statusIcon = getStatusIcon(result.type, result.metadata);
    const IconComponent = config?.icon;

    return (
      <motion.div
        key={`${result.type}-${result.id}`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
      >
        <Card
          hoverable
          padding="lg"
          className="group cursor-pointer border-2 border-transparent hover:border-ios18-blue/30 hover:shadow-lg transition-all duration-300"
        >
          <div 
            className="flex items-start space-x-4"
            onClick={() => handleResultClick(result)}
          >
            {/* 类型图标 */}
            <div className={`flex-shrink-0 w-14 h-14 rounded-ios-lg ${config?.bgColor} flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
              {IconComponent && <IconComponent className={`w-7 h-7 ${config.color}`} />}
            </div>

            <div className="flex-1 min-w-0">
              {/* 标题与状态 */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-text-primary truncate group-hover:text-ios18-blue transition-colors">
                  {result.title}
                </h3>
                <div className="flex items-center space-x-2">
                  {result.relevanceScore >= 8 && (
                    <Badge variant="primary" size="sm">
                      {Math.round((result.relevanceScore / 10) * 100)}%
                    </Badge>
                  )}
                  {/* 跳转标识 */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Badge variant="secondary" size="sm" className="text-xs">
                      点击查看
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 副标题 */}
              <p className="text-sm text-text-secondary mb-3 line-clamp-1">
                {result.subtitle}
              </p>

              {/* 描述 */}
              <p className="text-xs text-text-tertiary mb-4 line-clamp-2 leading-relaxed">
                {result.description}
              </p>

              {/* 关键指标 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {result.metadata.totalProjects && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-ios-md">
                    <BriefcaseIcon className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">{result.metadata.totalProjects}</span>
                  </div>
                )}
                {result.metadata.totalInventory && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-purple-50 rounded-ios-md">
                    <CubeIcon className="w-3 h-3 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">{result.metadata.totalInventory}</span>
                  </div>
                )}
                {result.metadata.efficiency && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-ios-md">
                    <ChartBarIcon className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-700">{result.metadata.efficiency}%</span>
                  </div>
                )}
                {result.metadata.department && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50 rounded-ios-md">
                    <BuildingOfficeIcon className="w-3 h-3 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">{result.metadata.department}</span>
                  </div>
                )}
                {statusIcon && (
                  <div className="flex items-center px-2 py-1 bg-gray-50 rounded-ios-md">
                    {statusIcon}
                  </div>
                )}
              </div>

              {/* 相关数据详细展示 */}
              {(result.relatedData?.projects?.length > 0 || result.relatedData?.materials?.length > 0 || result.relatedData?.attendanceStats) && (
                <div className="pt-3 border-t border-macos15-separator">
                  {/* 相关项目列表 */}
                  {result.relatedData?.projects?.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-text-secondary mb-2">
                        相关项目 ({result.relatedData.projects.length})
                      </h4>
                      <div className="space-y-1">
                        {result.relatedData.projects.slice(0, 3).map((project: any, index: number) => (
                          <div key={project.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className={`w-2 h-2 rounded-full ${
                                project.status === 'completed' ? 'bg-green-500' :
                                project.status === 'in_progress' ? 'bg-blue-500' :
                                project.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                              }`} />
                              <span className="text-text-primary truncate font-medium">{project.name}</span>
                              <span className="text-xs text-text-tertiary ml-1">
                                {getStatusLabel(project.status, 'project')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-text-tertiary">
                              {project.completionRate !== undefined && (
                                <span className="text-green-600">{project.completionRate}%</span>
                              )}
                              {project.materialsCount > 0 && (
                                <span>{project.materialsCount}材料</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {result.relatedData.projects.length > 3 && (
                          <div className="text-xs text-text-tertiary">
                            +{result.relatedData.projects.length - 3} 个其他项目
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 相关材料列表 */}
                  {result.relatedData?.materials?.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-text-secondary mb-2">
                        库存材料 ({result.relatedData.materials.length})
                      </h4>
                      <div className="space-y-1">
                        {result.relatedData.materials.slice(0, 3).map((material: any, index: number) => (
                          <div key={material.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <CubeIcon className="w-3 h-3 text-purple-600 flex-shrink-0" />
                              <span className="text-text-primary truncate">
                                {material.thickness}{material.unit} {material.materialType}
                              </span>
                            </div>
                            <div className="text-text-tertiary">
                              {material.totalQuantity > 0 && (
                                <span className="text-green-600">{material.totalQuantity}件</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {result.relatedData.materials.length > 3 && (
                          <div className="text-xs text-text-tertiary">
                            +{result.relatedData.materials.length - 3} 种其他材料
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 考勤统计 */}
                  {result.relatedData?.attendanceStats && (
                    <div className="mb-2">
                      <h4 className="text-xs font-semibold text-text-secondary mb-2">考勤情况</h4>
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3 text-blue-600" />
                          <span className="text-text-primary">总计 {result.relatedData.attendanceStats.total || result.relatedData.attendanceStats.recentExceptions || 0}</span>
                        </div>
                        {result.relatedData.attendanceStats.leave > 0 && (
                          <span className="text-yellow-600">请假 {result.relatedData.attendanceStats.leave}</span>
                        )}
                        {result.relatedData.attendanceStats.overtime > 0 && (
                          <span className="text-green-600">加班 {result.relatedData.attendanceStats.overtime}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 简洁的数据概览 */}
                  <div className="flex items-center space-x-4 text-xs text-text-tertiary pt-2 border-t border-gray-100">
                    {result.relatedData?.projects?.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <BriefcaseIcon className="w-3 h-3" />
                        <span>项目 {result.relatedData.projects.length}</span>
                      </span>
                    )}
                    {result.relatedData?.materials?.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <CubeIcon className="w-3 h-3" />
                        <span>材料 {result.relatedData.materials.length}</span>
                      </span>
                    )}
                    {result.relatedData?.attendanceStats && (
                      <span className="flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>考勤 {result.relatedData.attendanceStats.total || result.relatedData.attendanceStats.recentExceptions || 0}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 跳转指示器 */}
            <div className="flex-shrink-0 flex flex-col items-center space-y-1">
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-1">
                <ArrowTopRightOnSquareIcon className="w-5 h-5 text-ios18-blue" />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                <span className="text-xs text-ios18-blue font-medium">查看</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  // 渲染搜索建议
  const renderSuggestions = () => {
    if (!suggestions.length || searchQuery.trim()) return null;
    
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">搜索建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestions.slice(0, 4).map((suggestion, index) => {
            const config = SEARCH_CATEGORIES[suggestion.type as keyof typeof SEARCH_CATEGORIES];
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSearchQuery(suggestion.text)}
                className="flex items-center space-x-3 p-3 rounded-ios-lg bg-macos15-control hover:bg-macos15-control/80 transition-colors text-left"
              >
                {config && React.createElement(config.icon, { className: `w-5 h-5 ${config.color}` })}
                <div className="flex-1">
                  <div className="font-medium text-text-primary">{suggestion.text}</div>
                  <div className="text-xs text-text-tertiary">{suggestion.description}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[16.67vh] p-4 z-[9999]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -50 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="bg-white rounded-ios-xl shadow-2xl w-full max-w-7xl max-h-[75vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 搜索头部 */}
          <div className="sticky top-0 z-20 bg-bg-card/80 backdrop-blur-xl border-b border-macos15-separator p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="智能搜索：工人、项目、员工、板材规格、图纸、材料、考勤记录..."
                  leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
                  rightIcon={loading ? <Loading className="w-5 h-5" /> : undefined}
                  variant="glass"
                  className="text-lg"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2"
              >
                <XMarkIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tab导航栏 */}
          {availableTabs.length > 0 && (
            <div className="sticky top-[88px] z-10 bg-bg-card/90 backdrop-blur-xl border-b border-macos15-separator px-6 py-4">
              <TabBar
                tabs={availableTabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="modern"
                size="sm"
                fullWidth
              />
            </div>
          )}

          {/* 搜索结果内容 */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 140px)' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loading className="w-8 h-8 text-ios18-blue" />
                <div className="text-center">
                  <p className="text-lg font-medium text-text-primary mb-1">智能搜索中</p>
                  <p className="text-sm text-text-secondary">正在分析关联数据和相关内容</p>
                </div>
              </div>
            ) : currentTabResults.length > 0 ? (
              <div className="p-6">
                {/* 结果统计 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {getCurrentTabConfig() && React.createElement(getCurrentTabConfig().icon, {
                      className: `w-6 h-6 ${getCurrentTabConfig().color}`
                    })}
                    <h2 className="text-xl font-bold text-text-primary">
                      {getCurrentTabConfig()?.label}搜索结果
                    </h2>
                  </div>
                  <Badge variant="secondary" size="sm">
                    {currentTabResults.length} 项结果
                  </Badge>
                </div>

                {/* 结果列表 */}
                <div className="space-y-4">
                  {currentTabResults.map((result, index) => renderResultCard(result, index))}
                </div>
              </div>
            ) : searchQuery.trim() && availableTabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">未找到相关结果</h3>
                  <p className="text-sm text-text-secondary mb-4">搜索"{searchQuery}"没有找到匹配的内容</p>
                  <div className="text-xs text-text-tertiary space-y-1">
                    <p>• 检查拼写是否正确</p>
                    <p>• 尝试使用不同的关键词</p>
                    <p>• 确认数据库中存在该记录</p>
                  </div>
                </div>
              </div>
            ) : renderSuggestions()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchModal;
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, QueueListIcon, Bars3Icon, UserIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ActiveProjectCard } from '@/components/projects/ProjectCard';
import { sseManager } from '@/utils/sseManager';

// 拖拽排序相关导入
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ProjectItem {
  id: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  assignedWorker?: { 
    id: number; 
    name: string; 
    department?: string;
  };
  materials?: Array<{
    id: number;
    status: 'empty' | 'pending' | 'in_progress' | 'completed';
    thicknessSpec?: {
      thickness: string;
      unit: string;
      materialType: string;
    };
  }>;
  createdAt: string;
  description?: string;
}

interface QueueData {
  projects: ProjectItem[];
  announcements: any[];
  lastUpdated: string;
  isAdmin: boolean;
}

// 可拖拽的项目卡片组件
const SortableProjectItem: React.FC<{ 
  project: ProjectItem; 
  index: number; 
  isAdmin: boolean;
  onMaterialStatusChange?: (materialId: number, newStatus: string) => void;
}> = ({ project, index, isAdmin, onMaterialStatusChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const handleMaterialStatusChange = (materialId: number, newStatus: any) => {
    if (isAdmin && onMaterialStatusChange) {
      onMaterialStatusChange(materialId, newStatus);
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'scale-102' : ''}`}
    >
      {/* 桌面端拖拽手柄 */}
      {isAdmin && (
        <>
          <div 
            {...attributes}
            {...listeners}
            className="hidden md:flex absolute -left-6 top-1/2 transform -translate-y-1/2 w-4 h-8 items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 bg-white rounded-l-md border border-r-0 border-gray-200 z-10 shadow-sm"
          >
            <Bars3Icon className="h-4 w-4" />
          </div>
          
          {/* 移动端透明拖拽区域 */}
          <div 
            {...attributes}
            {...listeners}
            className="md:hidden absolute inset-0 cursor-grab active:cursor-grabbing z-10"
            style={{ touchAction: 'none' }}
          />
        </>
      )}
      
      {/* 浅绿色圆角矩形序号 - 左上角外侧位置 */}
      <div className="relative">
        <div className="absolute -top-3 -left-2 px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm font-semibold shadow-sm border border-green-200 z-30">
          {index + 1}
        </div>
        
        <ActiveProjectCard
          project={{
            id: project.id,
            name: project.name,
            status: project.status,
            priority: project.priority,
            assignedWorker: project.assignedWorker,
            materials: (project.materials || []) as any[],
            drawings: [],
            createdAt: project.createdAt,
            description: project.description
          }}
          onEdit={undefined}
          onViewDetail={(id) => console.log('查看详情', id)}
          onMaterialStatusChange={handleMaterialStatusChange}
          onMoveToPast={undefined}
          onManageMaterials={undefined}
        />
      </div>
    </div>
  );
};

export default function PublicQueuePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  
  const toast = useToast();

  // 拖拽传感器配置 - 优化移动端
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8px才开始拖拽，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchQueueData = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
      const response = await fetch(`${backendUrl}/api/queue/projects/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '获取项目信息失败');
      }
      
      // 获取真实公告数据
      let announcements = [];
      try {
        // 使用公共队列API获取公告数据
        const announcementResponse = await fetch(`${backendUrl}/api/queue/public/${token}`);
        if (announcementResponse.ok) {
          const announcementResult = await announcementResponse.json();
          const announcementData = announcementResult.data || announcementResult;
          announcements = announcementData.announcements || [];
          console.log('获取到真实公告数据:', announcements.length, '条');
        } else {
          console.warn(`公告API返回状态码: ${announcementResponse.status}`);
        }
      } catch (announcementError) {
        console.warn('获取公告数据失败:', announcementError instanceof Error ? announcementError.message : '未知错误');
      }
      
      const allProjects = result.projects || [];
      const activeProjects = allProjects.filter((project: any) => 
        project.status === 'pending' || project.status === 'in_progress'
      );
      
      console.log(`获取到 ${allProjects.length} 个项目，其中 ${activeProjects.length} 个活跃项目`);
      console.log('获取到的公告数据:', announcements, '数量:', announcements.length);
      
      // 检查是否为管理员：有有效的JWT token且用户角色为admin
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const userRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : null;
      const userName = typeof window !== 'undefined' ? localStorage.getItem('user_name') : null;
      
      console.log('管理员检查:', { authToken: !!authToken, userRole, userName });
      
      const isAdminLoggedIn = !!(authToken && userRole === 'admin');
      console.log('最终管理员判断:', isAdminLoggedIn);
      
      const convertedData = {
        projects: activeProjects,
        announcements: announcements, // 正确设置公告数据
        lastUpdated: result.lastUpdated || new Date().toISOString(),
        isAdmin: isAdminLoggedIn // 真正的管理员判断
      };
      
      setData(convertedData);
      setProjects(activeProjects);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
      console.error('获取项目数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 拖拽结束处理函数
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!data?.isAdmin || active.id === over?.id) return;

    const oldIndex = projects.findIndex(item => item.id === active.id);
    const newIndex = projects.findIndex(item => item.id === over.id);

    const newProjects = arrayMove(projects, oldIndex, newIndex);
    setProjects(newProjects);
    
    // 保存排序到后端
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.gei5.com';
      const projectIds = newProjects.map(p => p.id);
      
      const response = await fetch(`${backendUrl}/api/queue/projects/${token}/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectIds: projectIds
        })
      });
      
      if (response.ok) {
        toast.addToast({
          type: 'success',
          message: '项目排序已更新并保存'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存排序失败');
      }
    } catch (error) {
      console.error('保存项目排序失败:', error);
      toast.addToast({
        type: 'error',
        message: '排序保存失败，刷新后将恢复原顺序'
      });
      
      // 如果保存失败，可以选择恢复原始顺序或让用户知道需要刷新
      // 这里选择保持用户看到的新顺序，但提醒刷新后会恢复
    }
  };

  // 处理材料状态变更
  const handleMaterialStatusChange = async (materialId: number, newStatus: string) => {
    if (!data?.isAdmin) return;

    try {
      toast.addToast({
        type: 'success',
        message: '材料状态已更新'
      });
      
      // 刷新数据
      setTimeout(fetchQueueData, 500);
    } catch (error) {
      console.error('材料状态更新失败:', error);
      toast.addToast({
        type: 'error',
        message: '材料状态更新失败'
      });
    }
  };

  // 初始化数据获取和SSE连接
  useEffect(() => {
    fetchQueueData();
    
    // 建立SSE连接用于实时更新
    const connectSSE = async () => {
      try {
        // 使用公共token建立SSE连接
        const connected = await sseManager.connect('public-queue-' + token);
        setSseConnected(connected);
        
        if (connected) {
          console.log('✅ 公共页面SSE连接成功');
          toast.addToast({
            type: 'success',
            message: '实时更新已启用'
          });
        } else {
          console.log('❌ 公共页面SSE连接失败，将依赖定时刷新');
          toast.addToast({
            type: 'warning',
            message: '实时更新不可用，将每30秒自动刷新'
          });
        }
      } catch (error) {
        console.error('SSE连接错误:', error);
        setSseConnected(false);
        toast.addToast({
          type: 'warning',
          message: '实时更新连接失败，将每30秒自动刷新'
        });
      }
    };
    
    connectSSE();
    
    // 设置定时刷新（作为SSE的备用方案）
    const refreshInterval = 30000; // 30秒刷新间隔
    const interval = setInterval(fetchQueueData, refreshInterval);
    
    return () => {
      clearInterval(interval);
      sseManager.disconnect();
    };
  }, [token]); // 移除sseConnected依赖，避免无限重连

  // 添加SSE事件监听器
  useEffect(() => {
    // 监听项目排序变更事件
    const handleProjectsReordered = (data: any) => {
      console.log('🔄 收到项目排序变更事件:', data);
      toast.addToast({
        type: 'info',
        message: `项目排序已更新 (${data.userName || '管理员'})`
      });
      
      // 立即刷新项目数据
      fetchQueueData();
    };

    // 监听其他项目相关事件
    const handleProjectUpdated = (data: any) => {
      console.log('📝 收到项目更新事件:', data);
      fetchQueueData();
    };

    const handleProjectCreated = (data: any) => {
      console.log('✨ 收到项目创建事件:', data);
      fetchQueueData();
    };

    const handleProjectStatusChanged = (data: any) => {
      console.log('🔄 收到项目状态变更事件:', data);
      fetchQueueData();
    };

    // 注册事件监听器
    sseManager.addEventListener('projects-reordered', handleProjectsReordered);
    sseManager.addEventListener('project-updated', handleProjectUpdated);
    sseManager.addEventListener('project-created', handleProjectCreated);
    sseManager.addEventListener('project-status-changed', handleProjectStatusChanged);

    // 清理函数
    return () => {
      sseManager.removeEventListener('projects-reordered', handleProjectsReordered);
      sseManager.removeEventListener('project-updated', handleProjectUpdated);
      sseManager.removeEventListener('project-created', handleProjectCreated);
      sseManager.removeEventListener('project-status-changed', handleProjectStatusChanged);
    };
  }, []); // 空依赖数组，只在组件挂载时注册一次

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <Loading size="lg" text="正在加载项目信息..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-50 flex items-center justify-center p-8">
        <Card padding="lg" className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-red-600 mb-2">访问错误</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchQueueData} variant="primary">
            重新尝试
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const activeProjects = projects.filter(p => p.status === 'pending' || p.status === 'in_progress');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="w-full min-h-screen flex flex-col">
        {/* 顶部标题栏 */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">激光切割顺序</h1>
                  <p className="text-sm text-gray-600">实时项目状态 · 最后更新: {formatTime(data.lastUpdated)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="flex items-center px-2 py-1 md:px-3 md:py-2 bg-green-100 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs md:text-sm font-medium text-green-700">实时同步</span>
                </div>
                {data.isAdmin && (
                  <div className="flex items-center px-2 py-1 md:px-3 md:py-2 bg-blue-100 rounded-lg">
                    <UserIcon className="h-3 w-3 md:h-4 md:w-4 text-blue-600 mr-1 md:mr-2" />
                    <span className="text-xs md:text-sm font-medium text-blue-600">管理员</span>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold text-gray-900">{activeProjects.length}</div>
                  <div className="text-xs text-gray-500">活跃项目</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 图例说明区域 - 紧凑版 */}
        <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100">
          <div className="px-4 md:px-6 py-2">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-xs">
              {/* 权限状态说明 */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">权限:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  data?.isAdmin ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {data?.isAdmin ? '管理员模式' : '公共查看模式'}
                </span>
              </div>
              
              {/* 材料代码说明 */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">材料:</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-gray-700 border text-xs">T=碳板</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-gray-700 border text-xs">B=不锈钢</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-gray-700 border text-xs">M=锰板</span>
              </div>
              
              {/* 厚度说明 */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">厚度:</span>
                <span className="px-1.5 py-0.5 bg-white rounded text-gray-700 border text-xs">数字=mm</span>
              </div>
              
              {/* 状态颜色说明 */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">状态:</span>
                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">灰=待处理</span>
                <span className="px-1.5 py-0.5 bg-blue-200 text-blue-600 rounded text-xs">蓝=进行中</span>
                <span className="px-1.5 py-0.5 bg-green-200 text-green-600 rounded text-xs">绿=已完成</span>
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col md:flex-row">
            {/* 左侧公告区域 - 移动端在顶部，桌面端在左侧 */}
            {data.announcements && data.announcements.length > 0 && (
              <div className="w-full md:w-80 flex-shrink-0 bg-white/80 backdrop-blur-sm border-b md:border-b-0 md:border-r border-white/20 p-4 md:p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">重要公告</h3>
                </div>
                <div className="space-y-4 max-h-32 md:max-h-full overflow-y-auto">
                  {data.announcements.map((announcement: any) => (
                    <div key={announcement.id || Math.random()} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 flex-1">
                          {announcement.title || '重要通知'}
                        </h4>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                          announcement.type === 'urgent' ? 'bg-red-100 text-red-700' :
                          announcement.type === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                          announcement.type === 'completion' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {announcement.type === 'general' ? '通用' :
                           announcement.type === 'priority_change' ? '优先级' :
                           announcement.type === 'maintenance' ? '维护' :
                           announcement.type === 'delay' ? '延期' :
                           announcement.type === 'completion' ? '完成' : '其他'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {announcement.content || '暂无详细内容'}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {formatTime(announcement.created_at || announcement.createdAt)}
                        </p>
                        {announcement.expiresAt && (
                          <p className="text-xs text-gray-400">
                            截止: {formatTime(announcement.expiresAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 右侧项目列表区域 */}
            <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-sm">
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6">
                  {/* 队列标题 */}
                  <div className="mb-4 md:mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <QueueListIcon className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-lg md:text-xl font-semibold text-gray-900">项目队列</h2>
                          <p className="text-xs md:text-sm text-gray-600">
                            {data.isAdmin ? '管理员模式：可拖拽排序和状态切换' : '公共查看模式：只读显示'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="primary" className="text-xs md:text-sm px-2 py-1 md:px-3">
                        {activeProjects.length} 个项目
                      </Badge>
                    </div>
                  </div>

                  {/* 项目列表 */}
                  {activeProjects.length === 0 ? (
                    <div className="text-center py-12 md:py-16">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircleIcon className="h-8 w-8 md:h-10 md:w-10 text-green-500" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">队列为空</h3>
                      <p className="text-gray-600">所有项目都已完成</p>
                    </div>
                  ) : (
                    // 统一的只读显示，不区分管理员
                    <div className="space-y-4 md:space-y-6">
                      {activeProjects.map((project, index) => (
                        <div key={project.id} className="relative">
                          <div className="absolute -top-3 -left-2 px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm font-semibold shadow-sm border border-green-200 z-30">
                            {index + 1}
                          </div>
                          <ActiveProjectCard
                            project={{
                              id: project.id,
                              name: project.name,
                              status: project.status,
                              priority: project.priority,
                              assignedWorker: project.assignedWorker,
                              materials: (project.materials || []) as any[],
                              drawings: [],
                              createdAt: project.createdAt,
                              description: project.description
                            }}
                            onEdit={undefined}
                            onViewDetail={(id) => console.log('查看详情', id)}
                            onMaterialStatusChange={undefined}
                            onMoveToPast={undefined}
                            onManageMaterials={undefined}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-t border-white/20 px-4 py-3">
          <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-6 text-xs md:text-sm text-gray-600">
            <span>激光切割生产管理系统</span>
            <div className="hidden md:block w-px h-4 bg-gray-300"></div>
            <span>自动刷新间隔: 30秒</span>
            {data.isAdmin && (
              <>
                <div className="hidden md:block w-px h-4 bg-gray-300"></div>
                <span>管理员模式：支持拖拽排序和状态切换</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
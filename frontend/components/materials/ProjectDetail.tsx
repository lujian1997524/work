'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';

interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

interface Material {
  id: number;
  projectId: number;
  thicknessSpecId: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedBy?: { id: number; name: string };
  startDate?: string;
  completedDate?: string;
  notes?: string;
  thicknessSpec: ThicknessSpec;
}

interface Drawing {
  id: number;
  projectId: number;
  filename: string;
  version: string;
  filePath: string;
  uploadedBy: { id: number; name: string };
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  priority: string;
  description?: string;
  createdAt: string;
  creator?: { id: number; name: string };
  assignedWorker?: { id: number; name: string };
  materials: Material[];
  drawings: Drawing[];
}

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
  refreshTrigger?: number;
  className?: string;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  onBack,
  refreshTrigger = 0,
  className = ''
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const { token, user } = useAuth();

  useEffect(() => {
    fetchProjectDetail();
  }, [projectId, refreshTrigger]);

  const fetchProjectDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // 获取厚度规格
      const specsResponse = await apiRequest('/api/thickness-specs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // 获取项目详情
      const projectResponse = await apiRequest(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // 获取材料
      const materialsResponse = await apiRequest(`/api/materials/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // 获取图纸
      const drawingsResponse = await apiRequest(`/api/drawings/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!specsResponse.ok || !projectResponse.ok) {
        throw new Error('获取项目详情失败');
      }

      const specsData = await specsResponse.json();
      const projectData = await projectResponse.json();
      
      let materials: Material[] = [];
      let drawings: Drawing[] = [];

      if (materialsResponse.ok) {
        const materialsData = await materialsResponse.json();
        materials = materialsData.materials || [];
      }

      if (drawingsResponse.ok) {
        const drawingsData = await drawingsResponse.json();
        drawings = drawingsData.drawings || [];
      }

      const activeSpecs = (specsData.thicknessSpecs || [])
        .filter((spec: ThicknessSpec) => spec.isActive)
        .sort((a: ThicknessSpec, b: ThicknessSpec) => a.sortOrder - b.sortOrder);
      
      setThicknessSpecs(activeSpecs);
      setProject({
        ...projectData.project,
        materials,
        drawings
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取项目详情失败');
    } finally {
      setLoading(false);
    }
  };

  const getMaterialForSpec = (thicknessSpecId: number): Material | undefined => {
    return project?.materials.find(m => m.thicknessSpecId === thicknessSpecId);
  };

  const updateMaterialStatus = async (thicknessSpecId: number, newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!project) return;

    try {
      const existingMaterial = getMaterialForSpec(thicknessSpecId);
      
      if (existingMaterial) {
        // 准备更新数据
        const updateData: any = { 
          status: newStatus
        };

        // 如果状态变为 in_progress 且之前没有开始时间，设置开始时间
        if (newStatus === 'in_progress' && !existingMaterial.startDate) {
          updateData.startDate = new Date().toISOString();
        }

        // 如果状态变为 completed，设置完成时间和完成人
        if (newStatus === 'completed') {
          updateData.completedDate = new Date().toISOString();
          updateData.completedBy = user?.id;
        }

        // 更新现有材料
        const response = await apiRequest(`/api/materials/${existingMaterial.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          // 重新获取项目详情以更新状态
          await fetchProjectDetail();
          
          // 计算并更新项目状态
          await updateProjectStatus();
        }
      } else {
        // 创建新材料时的数据
        const createData: any = {
          projectId,
          thicknessSpecId,
          quantity: 1,
          status: newStatus
        };

        // 如果直接创建为 in_progress 状态，设置开始时间
        if (newStatus === 'in_progress') {
          createData.startDate = new Date().toISOString();
        }

        // 如果直接创建为 completed 状态，设置完成时间和完成人
        if (newStatus === 'completed') {
          createData.startDate = new Date().toISOString(); // 开始时间也要设置
          createData.completedDate = new Date().toISOString();
          createData.completedBy = user?.id;
        }

        // 创建新材料
        const createResponse = await apiRequest('/api/materials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(createData),
        });

        if (createResponse.ok) {
          const createResult = await createResponse.json();
          const newMaterial = createResult.material;
          
          // 重新获取项目详情以更新状态
          await fetchProjectDetail();
          
          // 计算并更新项目状态
          await updateProjectStatus();
        }
      }
    } catch (error) {
      console.error('更新材料状态失败:', error);
    }
  };

  // 根据材料状态自动更新项目状态
  const updateProjectStatus = async () => {
    if (!project) return;

    try {
      // 重新获取最新的材料状态
      const materialsResponse = await apiRequest(`/api/materials/project/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!materialsResponse.ok) return;

      const materialsData = await materialsResponse.json();
      const materials = materialsData.materials || [];

      let newProjectStatus = project.status; // 保持原状态作为默认

      // 项目状态逻辑：
      // 1. 只要有任何材料存在（从空白变成了某种状态），项目至少是pending
      // 2. 只要有任何材料是in_progress，项目就是in_progress
      // 3. 只有当所有非空白材料都是completed时，项目才是completed
      
      if (materials.length > 0) {
        const hasInProgress = materials.some((m: Material) => m.status === 'in_progress');
        const hasPending = materials.some((m: Material) => m.status === 'pending');
        const allCompleted = materials.every((m: Material) => m.status === 'completed');

        if (hasInProgress) {
          newProjectStatus = 'in_progress';
        } else if (allCompleted && materials.length > 0) {
          newProjectStatus = 'completed';
        } else if (hasPending || materials.length > 0) {
          newProjectStatus = 'pending';
        }
      }

      // 只有当状态发生变化时才更新项目
      if (newProjectStatus !== project.status) {
        const projectUpdateResponse = await apiRequest(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            status: newProjectStatus
          }),
        });

        if (projectUpdateResponse.ok) {
          // 更新成功后重新获取项目详情
          await fetchProjectDetail();
        }
      }
    } catch (error) {
      console.error('更新项目状态失败:', error);
    }
  };

  const updateMaterialNotes = async (materialId: number, notes: string) => {
    try {
      const response = await apiRequest(`/api/materials/${materialId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        fetchProjectDetail();
        setEditingNotes(null);
        setTempNotes('');
      }
    } catch (error) {
      console.error('更新备注失败:', error);
    }
  };

  const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed' | null) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        );
      case 'pending':
        return (
          <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full"></div>
        );
      default:
        return (
          <div className="w-6 h-6 border-2 border-dashed border-gray-300 rounded-full"></div>
        );
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleDrawingDownload = (drawing: Drawing) => {
    // 处理图纸下载
    window.open(`/api/drawings/download/${drawing.id}`, '_blank');
  };

  if (loading) {
    return (
      <div className={`bg-white/85 backdrop-blur-xl rounded-2xl border border-white/20 shadow-ios-lg ${className}`}>
        <div className="p-8 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-callout font-medium text-gray-700">正在加载项目详情...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={`bg-white/85 backdrop-blur-xl rounded-2xl border border-red-200/50 shadow-ios-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-callout font-semibold text-red-700">加载失败</p>
            <p className="text-caption1 text-red-600 max-w-sm">{error || '项目不存在'}</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-500 text-white text-caption1 font-medium rounded-md hover:bg-gray-600 transition-colors"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-white/85 backdrop-blur-xl rounded-2xl border border-white/20 shadow-ios-lg overflow-hidden ${className}`}>
      {/* 项目头部信息 */}
      <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/60 to-white/40 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="返回项目列表"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-600">
                  创建时间：{formatDateTime(project.createdAt)}
                </span>
                {project.assignedWorker && (
                  <span className="text-sm text-gray-600">
                    负责人：{project.assignedWorker.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              project.status === 'completed' ? 'bg-green-100 text-green-800' :
              project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {project.status === 'completed' ? '已完成' :
               project.status === 'in_progress' ? '进行中' : '待处理'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* 项目基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-gray-200 p-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">项目状态</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              project.status === 'completed' ? 'bg-green-100 text-green-800' :
              project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {project.status === 'completed' ? '已完成' :
               project.status === 'in_progress' ? '进行中' : '待处理'}
            </span>
          </div>
          
          <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-gray-200 p-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">负责工人</h4>
            <p className="text-sm text-gray-900">
              {project.assignedWorker?.name || '未分配'}
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-gray-200 p-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">图纸版本</h4>
            <p className="text-sm text-gray-900">
              {project.drawings.length > 0 ? `v${project.drawings[0].version}` : '无图纸'}
            </p>
          </div>
        </div>

        {/* 板材状态 - 简洁版本 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">板材状态</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {thicknessSpecs.map((spec) => (
                    <th key={spec.id} className="px-4 py-3 text-center">
                      <div className="text-center">
                        <div className="font-medium text-gray-800 text-sm leading-tight">
                          {spec.thickness}{spec.unit}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-normal" title={spec.materialType}>
                          {spec.materialType.length > 6 ? spec.materialType.substring(0, 6) + '...' : spec.materialType}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {thicknessSpecs.map((spec) => {
                    const material = getMaterialForSpec(spec.id);
                    const status = material?.status || null;
                    
                    return (
                      <td key={spec.id} className="px-4 py-4 text-center">
                        <button
                          onClick={() => {
                            const statusCycle = ['pending', 'in_progress', 'completed'];
                            const currentIndex = status ? statusCycle.indexOf(status) : -1;
                            const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length] as 'pending' | 'in_progress' | 'completed';
                            updateMaterialStatus(spec.id, nextStatus);
                          }}
                          className="hover:scale-110 transition-transform"
                          title={`点击切换状态 - ${spec.thickness}${spec.unit} ${spec.materialType}`}
                        >
                          {getStatusIcon(status)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 项目时间信息 */}
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">创建时间：</span>
                <span className="text-gray-900">{formatDateTime(project.createdAt)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">开始时间：</span>
                <span className="text-gray-900">
                  {(() => {
                    // 获取所有有开始时间的材料
                    const materialsWithStartDate = project.materials.filter(m => m.startDate);
                    if (materialsWithStartDate.length === 0) return '未开始';
                    
                    // 找到最早的开始时间（第一个材料开始进行中的时间）
                    const earliestStartDate = Math.min(...materialsWithStartDate.map(m => new Date(m.startDate!).getTime()));
                    return formatDateTime(new Date(earliestStartDate).toISOString());
                  })()}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">完成时间：</span>
                <span className="text-gray-900">
                  {(() => {
                    // 检查是否所有材料都已完成
                    const completedMaterials = project.materials.filter(m => m.status === 'completed' && m.completedDate);
                    const allMaterialsExist = project.materials.length > 0;
                    const allCompleted = allMaterialsExist && project.materials.every(m => m.status === 'completed');
                    
                    if (!allCompleted || completedMaterials.length === 0) return '未完成';
                    
                    // 找到最晚的完成时间（最后一个材料完成的时间）
                    const latestCompletionDate = Math.max(...completedMaterials.map(m => new Date(m.completedDate!).getTime()));
                    return formatDateTime(new Date(latestCompletionDate).toISOString());
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 图纸管理 - 占用剩余2/3空间 */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">项目图纸</h3>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              上传图纸
            </button>
          </div>
          
          {project.drawings.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 mb-2">暂无图纸文件</p>
              <p className="text-sm text-gray-500">点击上方按钮上传项目图纸</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.drawings.map((drawing, index) => (
                <motion.div
                  key={drawing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 truncate">{drawing.filename}</h4>
                        <p className="text-sm text-gray-600">v{drawing.version}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>上传人：{drawing.uploadedBy.name}</div>
                    <div>上传时间：{formatDateTime(drawing.createdAt)}</div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDrawingDownload(drawing)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 1.414A8 8 0 1010.586 2.414" />
                      </svg>
                      打开
                    </button>
                    <button className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      更新
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
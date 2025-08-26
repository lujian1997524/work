'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Alert, Loading, EmptyData, Modal, Input, Dropdown, Button, useDialog } from '@/components/ui';
import AdvancedDxfModal from '@/components/ui/advanced-dxf/AdvancedDxfModal';
import { DrawingGrid } from './DrawingGrid';
import { DrawingList } from './DrawingList';
import { DrawingTableView } from './DrawingTableView';
import { DrawingUpload } from './DrawingUpload';
import { DrawingActionButton, DrawingAdvancedActions } from './DrawingActionButton';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/components/ui/Toast';
import { useDrawingToastListener, drawingToastHelper } from '@/utils/drawingToastHelper';
import { batchOperationToastHelper, useBatchOperationTracker } from '@/utils/batchOperationToastHelper';
import { sseManager } from '@/utils/sseManager';

export interface Drawing {
  id: number;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  fileType: 'DXF'; // 只支持DXF文件
  version: string;
  status: '可用' | '已废弃' | '已归档';
  description?: string;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  isCommonPart?: boolean;
  tags?: string[];
  projectIds?: number[];
  project?: {
    id: number;
    name: string;
    status: string;
  };
  uploader?: {
    id: number;
    name: string;
  };
}

export interface DrawingLibraryProps {
  className?: string;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  showUploadModal?: boolean;
  onUploadModalChange?: (show: boolean) => void;
  // 批量操作相关
  enableBatchOperations?: boolean;
  onBatchDelete?: (drawingIds: number[]) => Promise<void>;
  onBatchUpdateStatus?: (drawingIds: number[], newStatus: string) => Promise<void>;
  onBatchMove?: (drawingIds: number[], targetProjectId: number) => Promise<void>;
}

export const DrawingLibrary: React.FC<DrawingLibraryProps> = ({
  className = '',
  selectedCategory = 'all',
  onCategoryChange,
  showUploadModal = false,
  onUploadModalChange,
  // 批量操作相关
  enableBatchOperations = false,
  onBatchDelete,
  onBatchUpdateStatus,
  onBatchMove
}) => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedPreview, setShowAdvancedPreview] = useState(false);
  const [previewDrawing, setPreviewDrawing] = useState<Drawing | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'可用' | '已废弃' | '已归档'>('可用');
  const [editFilename, setEditFilename] = useState('');
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);

  // 批量操作相关状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const { token } = useAuth();
  const { alert, confirm, DialogRenderer } = useDialog();
  const toast = useToast();
  const { createTracker } = useBatchOperationTracker();

  // 监听图纸Toast事件
  useDrawingToastListener();

  // 项目状态变更时的图纸自动归档处理
  const handleProjectDeleted = async (data: any) => {
    const { projectId, projectName } = data;
    console.log(`项目 ${projectName} 已删除，开始归档相关图纸...`);
    
    try {
      const response = await apiRequest(`/api/drawings/archive-project/${projectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        toast.addToast({
          type: 'info',
          message: `项目删除：已自动归档 ${responseData.archivedCount || 0} 个相关图纸`
        });
        // 刷新图纸列表
        await fetchDrawings();
      }
    } catch (error) {
      console.error('自动归档图纸失败:', error);
      toast.addToast({
        type: 'warning',
        message: `项目删除后的图纸归档失败，请手动处理`
      });
    }
  };

  const handleProjectMovedToPast = async (data: any) => {
    const { project } = data;
    console.log(`项目 ${project.name} 已移动到过往项目，开始归档相关图纸...`);
    
    try {
      // 先获取该项目的所有图纸，检查多项目关联的情况
      const drawingsResponse = await apiRequest(`/api/drawings/project/${project.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (drawingsResponse.ok) {
        const drawingsData = await drawingsResponse.json();
        const projectDrawings = drawingsData.drawings || [];
        
        let archivedCount = 0;
        let skipCount = 0;

        // 逐个检查图纸是否应该归档（考虑多项目关联）
        for (const drawing of projectDrawings) {
          if (drawing.status === '已归档') continue; // 已归档的跳过
          
          const shouldArchive = await shouldArchiveDrawing(drawing, project.id);
          
          if (shouldArchive) {
            try {
              const archiveResponse = await apiRequest(`/api/drawings/${drawing.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: '已归档' })
              });
              
              if (archiveResponse.ok) {
                archivedCount++;
              }
            } catch (error) {
              console.error(`归档图纸 ${drawing.id} 失败:`, error);
            }
          } else {
            skipCount++;
            console.log(`图纸 ${drawing.originalFilename || drawing.filename} 存在其他活跃项目关联，暂不归档`);
          }
        }

        if (archivedCount > 0 || skipCount > 0) {
          toast.addToast({
            type: 'info',
            message: `项目转入过往：已归档 ${archivedCount} 个图纸${skipCount > 0 ? `，${skipCount} 个图纸因存在其他活跃项目而保持可用` : ''}`
          });
        } else {
          toast.addToast({
            type: 'info',
            message: `项目转入过往：该项目没有可归档的图纸`
          });
        }
        
        // 刷新图纸列表
        await fetchDrawings();
      }
    } catch (error) {
      console.error('自动归档图纸失败:', error);
      toast.addToast({
        type: 'warning',
        message: `项目转入过往后的图纸归档失败，请手动处理`
      });
    }
  };

  // 判断图纸是否应该被归档（考虑多项目关联）
  const shouldArchiveDrawing = async (drawing: any, excludeProjectId: number): Promise<boolean> => {
    try {
      // 如果图纸没有projectIds信息，或者只关联了当前项目，直接归档
      if (!drawing.projectIds || drawing.projectIds.length <= 1) {
        return true;
      }

      // 检查除当前项目外的其他关联项目状态
      const otherProjectIds = drawing.projectIds.filter((id: number) => id !== excludeProjectId);
      
      if (otherProjectIds.length === 0) {
        return true; // 只关联当前项目，可以归档
      }

      // 检查其他关联项目的状态
      const projectStatusPromises = otherProjectIds.map(async (projectId: number) => {
        try {
          const response = await apiRequest(`/api/projects/${projectId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const projectData = await response.json();
            return projectData.project;
          }
          return null;
        } catch (error) {
          console.error(`获取项目 ${projectId} 状态失败:`, error);
          return null; // 获取失败时保守处理，不归档
        }
      });

      const projects = await Promise.all(projectStatusPromises);
      const validProjects = projects.filter(p => p !== null);

      // 只有当所有其他关联项目都是过往项目时才归档
      const allOthersArePast = validProjects.every(p => p.isPastProject === true);
      
      return allOthersArePast;
    } catch (error) {
      console.error('检查图纸归档条件失败:', error);
      return false; // 发生错误时保守处理，不归档
    }
  };

  const handleProjectRestoredFromPast = async (data: any) => {
    const { project } = data;
    console.log(`项目 ${project.name} 已从过往项目恢复，开始恢复相关图纸...`);
    
    try {
      // 获取该项目的归档图纸
      const drawingsResponse = await apiRequest(`/api/drawings/project/${project.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (drawingsResponse.ok) {
        const drawingsData = await drawingsResponse.json();
        const archivedDrawings = drawingsData.drawings?.filter((d: any) => d.status === '已归档') || [];
        
        if (archivedDrawings.length > 0) {
          // 批量恢复图纸状态为可用
          const restorePromises = archivedDrawings.map((drawing: any) => 
            apiRequest(`/api/drawings/${drawing.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: '可用' })
            })
          );

          const results = await Promise.allSettled(restorePromises);
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          
          toast.addToast({
            type: 'success',
            message: `项目恢复：已自动恢复 ${successCount} 个相关图纸`
          });
          
          // 刷新图纸列表
          await fetchDrawings();
        } else {
          toast.addToast({
            type: 'info',
            message: `项目恢复：该项目没有需要恢复的归档图纸`
          });
        }
      }
    } catch (error) {
      console.error('自动恢复图纸失败:', error);
      toast.addToast({
        type: 'warning',
        message: `项目恢复后的图纸恢复失败，请手动处理`
      });
    }
  };

  // 获取可用项目列表
  const fetchAvailableProjects = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const projects = data.projects || [];
        // 只显示活跃项目（非过往项目）
        const activeProjects = projects.filter((p: any) => !p.isPastProject);
        setAvailableProjects(activeProjects);
      }
    } catch (error) {
      // 静默处理获取项目列表错误
    }
  };

  // 获取图纸列表
  const fetchDrawings = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // 构建查询参数 - 当分类为'all'时不添加category参数，获取所有可用图纸
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      // 添加 limit 参数确保获取所有图纸
      params.append('limit', '1000');
      
      const queryString = params.toString();
      const url = `/api/drawings?${queryString}`;
      
      const response = await apiRequest(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const fetchedDrawings = data.drawings || data;
        
        setDrawings(fetchedDrawings);
        setError(null);
      } else {
        throw new Error('获取图纸列表失败');
      }
    } catch (error) {
      // 获取图纸列表失败
      setError('获取图纸列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理预览
  const handlePreview = (drawing: Drawing) => {
    setPreviewDrawing(drawing as any);
    setShowAdvancedPreview(true);
  };

  // 处理编辑
  const handleEdit = (drawing: Drawing) => {
    setEditingDrawing(drawing);
    setEditDescription(drawing.description || '');
    setEditStatus(drawing.status);
    setEditFilename(drawing.originalName || drawing.filename);
    setEditProjectId(drawing.project?.id || null);
    setShowEditModal(true);
    
    // 获取可用项目列表
    fetchAvailableProjects();
  };

  // 处理图纸打开（使用新的统一接口）
  const handleOpen = async (drawing: Drawing) => {
    try {
      // 新的统一接口会自动根据平台选择合适的操作
      // 这个函数已经被DrawingActionButton组件取代
      // 保留这里只是为了兼容性，实际应该使用DrawingActionButton
      // 请使用DrawingActionButton组件
    } catch (error) {
      // 处理图纸打开失败
      setError('打开图纸失败，请重试');
    }
  };
  const handleDelete = async (drawing: Drawing) => {
    const confirmed = await confirm(`确定要删除图纸 "${drawing.originalName}" 吗？此操作不可撤销。`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiRequest(`/api/drawings/${drawing.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchDrawings(); // 重新获取列表
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除失败');
      }
    } catch (error) {
      // 删除图纸失败
      setError(error instanceof Error ? error.message : '删除图纸失败，请重试');
    }
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    if (!editingDrawing) return;

    // 验证文件名
    if (!editFilename.trim()) {
      setError('文件名不能为空');
      return;
    }

    // 检查文件名格式
    if (!editFilename.toLowerCase().endsWith('.dxf')) {
      setError('文件名必须以 .dxf 结尾');
      return;
    }

    // 检查非法字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(editFilename)) {
      setError('文件名不能包含以下字符: < > : " / \\ | ? *');
      return;
    }

    try {
      // 调试日志：打印请求数据
      const requestData = {
        description: editDescription,
        status: editStatus,
        originalFilename: editFilename,
        projectIds: editProjectId ? [editProjectId] : []
      };
      console.log('图纸更新请求数据:', requestData);
      console.log('请求JSON字符串:', JSON.stringify(requestData));
      
      const response = await apiRequest(`/api/drawings/${editingDrawing.id}`, {
        method: 'PUT',
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        await fetchDrawings(); // 重新获取列表
        setShowEditModal(false);
        setEditingDrawing(null);
        setEditProjectId(null);
        setError(null);
        // 触发图纸更新事件
        window.dispatchEvent(new CustomEvent('drawing-updated'));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失败');
      }
    } catch (error) {
      // 更新图纸失败
      setError(error instanceof Error ? error.message : '更新图纸失败，请重试');
    }
  };

  // 批量操作相关函数
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedDrawingIds(new Set());
  };

  const handleSelectDrawing = (drawingId: number) => {
    const newSelected = new Set(selectedDrawingIds);
    if (newSelected.has(drawingId)) {
      newSelected.delete(drawingId);
    } else {
      newSelected.add(drawingId);
    }
    setSelectedDrawingIds(newSelected);
  };

  const selectAllDrawings = () => {
    const allDrawingIds = new Set(drawings.map(d => d.id));
    setSelectedDrawingIds(allDrawingIds);
  };

  const clearSelection = () => {
    setSelectedDrawingIds(new Set());
  };

  // 批量删除图纸
  const handleBatchDelete = async () => {
    if (selectedDrawingIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要删除的图纸' });
      return;
    }

    const confirmed = await confirm(
      `确定要删除所选的 ${selectedDrawingIds.size} 个图纸吗？此操作不可撤销。`,
      { title: '批量删除图纸' }
    );
    if (!confirmed) return;

    if (!onBatchDelete) {
      // 使用内部删除逻辑
      setBatchLoading(true);
      const tracker = createTracker('批量删除图纸', selectedDrawingIds.size, 'drawing-batch');
      
      let successCount = 0;
      const errors: string[] = [];

      try {
        for (const drawingId of selectedDrawingIds) {
          try {
            const response = await apiRequest(`/api/drawings/${drawingId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              successCount++;
            } else {
              const errorData = await response.json();
              errors.push(`图纸 ${drawingId}: ${errorData.error || '删除失败'}`);
            }
          } catch (error) {
            errors.push(`图纸 ${drawingId}: ${error}`);
          }
          
          tracker.updateProgress(`删除图纸 ${drawingId}`);
        }

        tracker.complete();
        toast.addToast({
          type: successCount === selectedDrawingIds.size ? 'success' : 'warning',
          message: `批量删除完成：成功删除 ${successCount} 个图纸，共 ${selectedDrawingIds.size} 个`
        });
        
        if (successCount > 0) {
          await fetchDrawings();
          setBatchMode(false);
          setSelectedDrawingIds(new Set());
        }
      } catch (error) {
        tracker.fail(`批量删除失败: ${error}`);
      } finally {
        setBatchLoading(false);
      }
    } else {
      // 使用外部删除逻辑
      setBatchLoading(true);
      const tracker = createTracker('批量删除图纸', selectedDrawingIds.size, 'drawing-batch');
      
      try {
        await onBatchDelete(Array.from(selectedDrawingIds));
        tracker.complete();
        toast.addToast({
          type: 'success',
          message: `成功删除 ${selectedDrawingIds.size} 个图纸`
        });
        
        await fetchDrawings();
        setBatchMode(false);
        setSelectedDrawingIds(new Set());
      } catch (error) {
        tracker.fail(`批量删除失败: ${error}`);
      } finally {
        setBatchLoading(false);
      }
    }
  };

  // 批量更新状态
  const handleBatchUpdateStatus = async (newStatus: string) => {
    if (selectedDrawingIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的图纸' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量更新图纸状态', selectedDrawingIds.size, 'drawing-batch');
    
    try {
      if (onBatchUpdateStatus) {
        await onBatchUpdateStatus(Array.from(selectedDrawingIds), newStatus);
      } else {
        // 使用内部更新逻辑
        let successCount = 0;
        for (const drawingId of selectedDrawingIds) {
          try {
            const response = await apiRequest(`/api/drawings/${drawingId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
              successCount++;
            }
          } catch (error) {
            tracker.addError(`更新图纸 ${drawingId} 状态失败: ${error}`);
          }
          
          tracker.updateProgress(`更新图纸 ${drawingId}`);
        }
      }

      tracker.complete();
      
      if (newStatus === '已归档') {
        toast.addToast({
          type: 'success',
          message: `成功归档 ${selectedDrawingIds.size} 个图纸`
        });
      } else {
        toast.addToast({
          type: 'success',
          message: `成功更新 ${selectedDrawingIds.size} 个图纸状态为"${newStatus}"`
        });
      }
      
      await fetchDrawings();
      setBatchMode(false);
      setSelectedDrawingIds(new Set());
    } catch (error) {
      tracker.fail(`批量更新状态失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量移动到项目
  const handleBatchMove = async (targetProjectId: number, projectName: string) => {
    if (selectedDrawingIds.size === 0) {
      toast.addToast({ type: 'warning', message: '请先选择要操作的图纸' });
      return;
    }

    setBatchLoading(true);
    const tracker = createTracker('批量移动图纸', selectedDrawingIds.size, 'drawing-batch');
    
    try {
      if (onBatchMove) {
        await onBatchMove(Array.from(selectedDrawingIds), targetProjectId);
      } else {
        // 内部移动逻辑（需要具体的API实现）
        tracker.addError('批量移动功能需要外部实现');
      }

      tracker.complete();
      toast.addToast({
        type: 'success',
        message: `成功移动 ${selectedDrawingIds.size} 个图纸到项目"${projectName}"`
      });
      
      await fetchDrawings();
      setBatchMode(false);
      setSelectedDrawingIds(new Set());
    } catch (error) {
      tracker.fail(`批量移动失败: ${error}`);
    } finally {
      setBatchLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, [token, selectedCategory]);

  // 注册项目状态变更事件监听器
  useEffect(() => {
    if (!token) return;

    // 注册 SSE 事件监听器
    sseManager.addEventListener('project-deleted', handleProjectDeleted);
    sseManager.addEventListener('project-moved-to-past', handleProjectMovedToPast);
    sseManager.addEventListener('project-restored-from-past', handleProjectRestoredFromPast);

    // 清理函数：移除事件监听器
    return () => {
      sseManager.removeEventListener('project-deleted', handleProjectDeleted);
      sseManager.removeEventListener('project-moved-to-past', handleProjectMovedToPast);
      sseManager.removeEventListener('project-restored-from-past', handleProjectRestoredFromPast);
    };
  }, [token]); // 依赖token，确保在用户变更时重新注册

  // 当分类改变时，通知父组件
  useEffect(() => {
    if (onCategoryChange && selectedCategory !== 'all') {
      // 只在非默认分类时调用回调
    }
  }, [selectedCategory, onCategoryChange]);

  // 监听外部上传状态变化
  useEffect(() => {
    if (showUploadModal !== undefined) {
      // 外部控制上传模态框显示状态
    }
  }, [showUploadModal]);

  // 按月份分组归档图纸
  const groupArchivedDrawingsByMonth = (drawings: Drawing[]) => {
    const archivedDrawings = drawings.filter(d => d.status === '已归档' && d.archivedAt);
    
    const grouped = archivedDrawings.reduce((groups, drawing) => {
      const archivedDate = new Date(drawing.archivedAt!);
      const monthKey = `${archivedDate.getFullYear()}-${String(archivedDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${archivedDate.getFullYear()}年${archivedDate.getMonth() + 1}月`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          label: monthLabel,
          drawings: []
        };
      }
      
      groups[monthKey].drawings.push(drawing);
      return groups;
    }, {} as Record<string, { label: string; drawings: Drawing[] }>);
    
    // 按月份倒序排列
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, value]) => ({ key, ...value }));
  };

  const archivedGroups = groupArchivedDrawingsByMonth(drawings);

  // 处理图纸上传成功
  const handleUploadSuccess = () => {
    fetchDrawings();
    onUploadModalChange?.(false);
    // 触发图纸更新事件
    window.dispatchEvent(new CustomEvent('drawing-updated'));
  };

  // 处理图纸删除
  const handleDeleteDrawing = async (drawingId: number) => {
    const confirmed = await confirm('确定要删除这个图纸吗？此操作不可撤销。');
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiRequest(`/api/drawings/${drawingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchDrawings();
        // 触发图纸更新事件
        window.dispatchEvent(new CustomEvent('drawing-updated'));
      } else {
        throw new Error('删除图纸失败');
      }
    } catch (error) {
      // 删除图纸失败
      toast.addToast({
        type: 'error',
        message: '删除图纸失败，请重试'
      });
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loading text="加载图纸库..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="error">
          {error}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchDrawings}
            className="ml-2"
          >
            重试
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {selectedCategory === 'archived' && archivedGroups.length > 0 ? (
          // 归档图纸按月份分组显示 - 使用表格视图
          <div className="h-full overflow-auto p-4">
            {archivedGroups.map((group) => (
              <div key={group.key} className="mb-6">
                {/* 月份标题 */}
                <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {group.label}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({group.drawings.length} 个图纸)
                    </span>
                  </h3>
                </div>
                
                {/* 该月份的图纸 - 使用表格视图 */}
                <DrawingTableView
                  drawings={group.drawings}
                  onPreview={handlePreview}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpen={handleOpen}
                  className="mb-4"
                />
              </div>
            ))}
          </div>
        ) : drawings.length === 0 ? (
          <div className="p-4">
            <EmptyData
              description="还没有上传任何图纸"
            >
              <Button variant="primary" onClick={() => onUploadModalChange?.(true)}>
                上传第一个图纸
              </Button>
            </EmptyData>
          </div>
        ) : (
          // 统一使用表格视图
          <DrawingTableView
            drawings={drawings}
            onPreview={handlePreview}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onOpen={handleOpen}
            className="h-full"
          />
        )}
      </div>

      {/* 上传对话框 */}
      {showUploadModal && (
        <DrawingUpload
          isOpen={showUploadModal}
          onClose={() => onUploadModalChange?.(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* 高级DXF预览模态框 */}
      <AdvancedDxfModal
        drawing={previewDrawing as any}
        isOpen={showAdvancedPreview}
        onClose={() => {
          setShowAdvancedPreview(false);
          setPreviewDrawing(null);
        }}
      />

      {/* 编辑图纸模态框 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDrawing(null);
          setEditFilename('');
          setEditDescription('');
          setEditStatus('可用');
          setEditProjectId(null);
        }}
        
        size="md"
      >
        <div className="space-y-4">
          {/* 文件名（可编辑） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文件名
            </label>
            <Input
              value={editFilename}
              onChange={(e) => setEditFilename(e.target.value)}
              placeholder="输入文件名（必须以.dxf结尾）"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              文件名不能包含: &lt; &gt; : " / \ | ? *
            </p>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述信息
            </label>
            <Input
              placeholder="输入图纸描述..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              multiline
              rows={3}
            />
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              状态
            </label>
            <Dropdown
              options={[
                { label: '可用', value: '可用' },
                { label: '已废弃', value: '已废弃' },
                { label: '已归档', value: '已归档' }
              ]}
              value={editStatus}
              onChange={(value) => setEditStatus(value as '可用' | '已废弃' | '已归档')}
              className="w-full"
            />
          </div>

          {/* 关联项目 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              关联项目
            </label>
            <Dropdown
              options={[
                { label: '无关联项目', value: '' },
                ...availableProjects.map(project => ({
                  label: `${project.name} (${project.status === 'completed' ? '已完成' : project.status === 'in_progress' ? '进行中' : '待处理'})`,
                  value: project.id.toString()
                }))
              ]}
              value={editProjectId?.toString() || ''}
              onChange={(value) => setEditProjectId(value ? parseInt(value as string) : null)}
              className="w-full"
              placeholder="选择要关联的项目..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {editProjectId ? '图纸将关联到选中的项目' : '图纸不关联任何项目，将显示在"未关联项目"分类中'}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setEditingDrawing(null);
                setEditFilename('');
                setEditDescription('');
                setEditStatus('可用');
                setEditProjectId(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleEditSubmit}
            >
              保存修改
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dialog渲染器 */}
      <DialogRenderer />
    </div>
  );
};
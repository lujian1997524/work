'use client';

import React, { useState, useEffect } from 'react';
import { DrawingLibrary } from '@/components/drawings';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/utils/api';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

export default function DrawingArchiveTest() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const toast = useToast();

  // 获取项目列表
  const fetchProjects = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  // 测试项目移动到过往
  const handleMoveProjectToPast = async (projectId: number, projectName: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/projects/${projectId}/move-to-past`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.addToast({
          type: 'success',
          message: `项目 "${projectName}" 已移动到过往项目`
        });
        await fetchProjects();
      } else {
        throw new Error('移动项目失败');
      }
    } catch (error) {
      console.error('移动项目到过往失败:', error);
      toast.addToast({
        type: 'error',
        message: `移动项目到过往失败: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  // 测试项目从过往恢复
  const handleRestoreProjectFromPast = async (projectId: number, projectName: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/projects/${projectId}/restore-from-past`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.addToast({
          type: 'success',
          message: `项目 "${projectName}" 已从过往项目恢复`
        });
        await fetchProjects();
      } else {
        throw new Error('恢复项目失败');
      }
    } catch (error) {
      console.error('恢复项目失败:', error);
      toast.addToast({
        type: 'error',
        message: `恢复项目失败: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  // 获取过往项目
  const [pastProjects, setPastProjects] = useState<any[]>([]);
  
  const fetchPastProjects = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/api/projects/past', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPastProjects(data.projects || []);
      }
    } catch (error) {
      console.error('获取过往项目失败:', error);
    }
  };

  useEffect(() => {
    fetchPastProjects();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">图纸自动归档功能测试</h1>
          <p className="mt-2 text-gray-600">
            测试项目状态变更时的图纸自动归档和恢复功能
          </p>
        </div>

        {/* 操作区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 活跃项目 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">活跃项目</h2>
            <div className="space-y-3">
              {projects.filter(p => !p.isPastProject).map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-500">状态: {project.status}</div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleMoveProjectToPast(project.id, project.name)}
                      disabled={loading}
                    >
                      移动到过往
                    </Button>
                  </div>
                </div>
              ))}
              {projects.filter(p => !p.isPastProject).length === 0 && (
                <div className="text-gray-500 text-center py-4">暂无活跃项目</div>
              )}
            </div>
          </div>

          {/* 过往项目 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">过往项目</h2>
            <div className="space-y-3">
              {pastProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-500">
                      移动时间: {new Date(project.movedToPastAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleRestoreProjectFromPast(project.id, project.name)}
                      disabled={loading}
                    >
                      恢复项目
                    </Button>
                  </div>
                </div>
              ))}
              {pastProjects.length === 0 && (
                <div className="text-gray-500 text-center py-4">暂无过往项目</div>
              )}
            </div>
          </div>
        </div>

        {/* 图纸库组件 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">图纸库 - 实时归档测试</h2>
            <p className="text-sm text-gray-600 mt-1">
              当项目状态变更时，相关图纸会自动归档或恢复，Toast提示会显示处理结果
            </p>
          </div>
          <div className="p-6">
            <DrawingLibrary className="h-[600px]" />
          </div>
        </div>

        {/* 功能说明 */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-4">功能测试说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">测试步骤：</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>选择一个有关联图纸的活跃项目</li>
                <li>点击"移动到过往"按钮</li>
                <li>观察Toast提示和图纸库的变化</li>
                <li>从过往项目中恢复该项目</li>
                <li>观察图纸是否自动恢复可用状态</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">预期行为：</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>项目移动到过往时，相关图纸自动归档</li>
                <li>项目恢复时，归档图纸自动恢复为可用</li>
                <li>多项目关联的图纸会智能判断是否归档</li>
                <li>显示详细的操作提示和结果反馈</li>
                <li>图纸库实时更新显示最新状态</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
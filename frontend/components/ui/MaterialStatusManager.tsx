'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, Card, Input, Modal, Avatar, Tooltip } from '@/components/ui';
import {
  CogIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  TagIcon,
  ChartBarIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

// 类型定义
export type MaterialStatusType = 'pending' | 'in_progress' | 'completed';

export interface MaterialInfo {
  id: number;
  projectId: number;
  projectName: string;
  thicknessSpecId: number;
  materialType: string;
  thickness: string;
  unit: string;
  status: MaterialStatusType;
  quantity?: number;
  assignedWorker?: {
    id: number;
    name: string;
  };
  startDate?: string;
  completedDate?: string;
  completedBy?: {
    id: number;
    name: string;
  };
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface MaterialStatusManagerProps {
  materials: MaterialInfo[];
  onStatusChange?: (materialId: number, newStatus: MaterialStatusType) => void;
  onMaterialUpdate?: (materialId: number, updates: Partial<MaterialInfo>) => void;
  onMaterialAdd?: (material: Omit<MaterialInfo, 'id'>) => void;
  onMaterialDelete?: (materialId: number) => void;
  showAddButton?: boolean;
  groupBy?: 'none' | 'project' | 'material_type' | 'status' | 'worker';
  filterBy?: {
    materialType?: string;
    status?: MaterialStatusType;
    workerId?: number;
    projectId?: number;
  };
  displayMode?: 'grid' | 'list' | 'timeline' | 'compact' | 'mini';
  enableBatchOperations?: boolean;
  enableSoundFeedback?: boolean;
  className?: string;
}

interface MaterialBatch {
  projectName: string;
  materialType: string;
  thickness: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedWorkerId?: number;
  notes?: string;
}

// 状态配置
const statusConfig = {
  pending: {
    label: '待处理',
    color: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
    icon: ClockIcon,
    description: '已分配，等待开始处理'
  },
  in_progress: {
    label: '进行中',
    color: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    icon: PlayIcon,
    description: '正在加工处理中'
  },
  completed: {
    label: '已完成',
    color: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    icon: CheckCircleIcon,
    description: '加工已完成'
  }
};

// 优先级配置
const priorityConfig = {
  low: { label: '低', color: 'bg-gray-100', textColor: 'text-gray-700', indicator: '🔵' },
  medium: { label: '中', color: 'bg-blue-100', textColor: 'text-blue-700', indicator: '🟡' },
  high: { label: '高', color: 'bg-orange-100', textColor: 'text-orange-700', indicator: '🟠' },
  urgent: { label: '紧急', color: 'bg-red-100', textColor: 'text-red-700', indicator: '🔴' }
};

// 材料类型代码映射
const getMaterialCode = (materialType: string) => {
  const typeMap: { [key: string]: string } = {
    '碳板': 'T',
    '不锈钢': 'B',
    '锰板': 'M',
    '钢板': 'S'
  };
  return typeMap[materialType] || materialType.charAt(0).toUpperCase();
};

export const MaterialStatusManager: React.FC<MaterialStatusManagerProps> = ({
  materials,
  onStatusChange,
  onMaterialUpdate,
  onMaterialAdd,
  onMaterialDelete,
  showAddButton = true,
  groupBy = 'none',
  filterBy,
  displayMode = 'grid',
  enableBatchOperations = true,
  enableSoundFeedback = true,
  className = ''
}) => {
  const [selectedMaterials, setSelectedMaterials] = useState<Set<number>>(new Set());
  const [editingMaterial, setEditingMaterial] = useState<MaterialInfo | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(enableSoundFeedback);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 音频反馈
  const playSound = useCallback((type: 'success' | 'error' | 'info' = 'info') => {
    if (!soundEnabled) return;
    
    // 这里可以播放不同的音效
    const frequencies = {
      success: 800,
      error: 300,
      info: 500
    };
    
    // 创建简单的音效（实际项目中建议使用音频文件）
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        // 音频播放失败，忽略错误
      }
    }
  }, [soundEnabled]);

  // 筛选和分组材料
  const filteredMaterials = React.useMemo(() => {
    let filtered = materials;

    if (filterBy) {
      if (filterBy.materialType) {
        filtered = filtered.filter(m => m.materialType === filterBy.materialType);
      }
      if (filterBy.status) {
        filtered = filtered.filter(m => m.status === filterBy.status);
      }
      if (filterBy.workerId) {
        filtered = filtered.filter(m => m.assignedWorker?.id === filterBy.workerId);
      }
      if (filterBy.projectId) {
        filtered = filtered.filter(m => m.projectId === filterBy.projectId);
      }
    }

    return filtered;
  }, [materials, filterBy]);

  const groupedMaterials = React.useMemo(() => {
    if (groupBy === 'none') {
      return { '全部材料': filteredMaterials };
    }

    const groups: { [key: string]: MaterialInfo[] } = {};

    filteredMaterials.forEach(material => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'project':
          groupKey = material.projectName;
          break;
        case 'material_type':
          groupKey = material.materialType;
          break;
        case 'status':
          groupKey = statusConfig[material.status].label;
          break;
        case 'worker':
          groupKey = material.assignedWorker?.name || '未分配';
          break;
        default:
          groupKey = '全部材料';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(material);
    });

    return groups;
  }, [filteredMaterials, groupBy]);

  // 状态切换
  const handleStatusChange = useCallback((materialId: number, currentStatus: MaterialStatusType) => {
    const getNextStatus = (status: MaterialStatusType): MaterialStatusType => {
      const cycle: MaterialStatusType[] = ['pending', 'in_progress', 'completed'];
      const currentIndex = cycle.indexOf(status);
      const nextIndex = (currentIndex + 1) % cycle.length;
      return cycle[nextIndex];
    };

    const nextStatus = getNextStatus(currentStatus);
    onStatusChange?.(materialId, nextStatus);
    playSound(nextStatus === 'completed' ? 'success' : 'info');
  }, [onStatusChange, playSound]);

  // 批量操作
  const handleBatchStatusChange = useCallback((status: MaterialStatusType) => {
    selectedMaterials.forEach(materialId => {
      onStatusChange?.(materialId, status);
    });
    setSelectedMaterials(new Set());
    playSound('success');
  }, [selectedMaterials, onStatusChange, playSound]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (confirm(`确定要删除选中的 ${selectedMaterials.size} 个材料吗？`)) {
      selectedMaterials.forEach(materialId => {
        onMaterialDelete?.(materialId);
      });
      setSelectedMaterials(new Set());
      playSound('error');
    }
  }, [selectedMaterials, onMaterialDelete, playSound]);

  // 编辑材料
  const handleEditMaterial = useCallback((material: MaterialInfo) => {
    setEditingMaterial(material);
    setShowEditModal(true);
  }, []);

  // 格式化时间
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '未设置';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染材料状态按钮
  const renderStatusButton = useCallback((material: MaterialInfo) => {
    const config = statusConfig[material.status];
    const materialCode = getMaterialCode(material.materialType);
    const displayText = `${materialCode}${parseFloat(material.thickness)}`;

    return (
      <motion.button
        key={`${material.id}-${material.status}`}
        type="button"
        className={`
          relative w-full min-h-[48px] rounded-lg font-medium text-sm
          ${config.color} ${config.textColor} ${config.borderColor}
          border-2 transition-all duration-300 
          hover:scale-105 hover:shadow-lg active:scale-95
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        onClick={() => handleStatusChange(material.id, material.status)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 20,
          delay: Math.random() * 0.1 
        }}
        
      >
        <div className="flex flex-col items-center justify-center p-2 space-y-1">
          <div className="flex items-center space-x-1">
            {typeof config.icon === 'string' ? (
              <span className="text-lg">{config.icon}</span>
            ) : (
              React.createElement(config.icon, { className: "w-4 h-4" })
            )}
            <span className="font-bold">{displayText}</span>
          </div>
          
          {material.quantity && material.quantity > 1 && (
            <Badge variant="secondary" size="sm" className="absolute -top-1 -right-1">
              {material.quantity}
            </Badge>
          )}
          
          {material.priority && material.priority !== 'low' && (
            <div className="absolute top-0 left-0 text-xs">
              {priorityConfig[material.priority].indicator}
            </div>
          )}
          
          <div className="text-xs opacity-75 truncate max-w-full">
            {material.assignedWorker?.name || '未分配'}
          </div>
        </div>
      </motion.button>
    );
  }, [handleStatusChange]);

  // 渲染材料卡片（详细视图）
  const renderMaterialCard = useCallback((material: MaterialInfo) => {
    const config = statusConfig[material.status];
    const isSelected = selectedMaterials.has(material.id);

    return (
      <motion.div
        key={material.id}
        className={`
          relative p-4 rounded-xl border-2 transition-all duration-300
          ${config.borderColor} ${config.color}
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
          hover:shadow-lg
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.random() * 0.1 }}
      >
        {/* 选择框 */}
        {enableBatchOperations && (
          <input
            type="checkbox"
            className="absolute top-2 right-2 w-4 h-4 rounded border-gray-300"
            checked={isSelected}
            onChange={(e) => {
              const newSelected = new Set(selectedMaterials);
              if (e.target.checked) {
                newSelected.add(material.id);
              } else {
                newSelected.delete(material.id);
              }
              setSelectedMaterials(newSelected);
            }}
          />
        )}

        {/* 材料基本信息 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">
              {getMaterialCode(material.materialType)}{parseFloat(material.thickness)}
              <span className="text-sm font-normal ml-1">({material.materialType})</span>
            </h3>
            {material.priority && (
              <Badge 
                variant={material.priority === 'urgent' ? 'danger' : 'secondary'}
                size="sm"
              >
                {priorityConfig[material.priority].label}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-1">项目：{material.projectName}</p>
          
          {material.assignedWorker && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <UserIcon className="w-4 h-4" />
              <span>{material.assignedWorker.name}</span>
            </div>
          )}
        </div>

        {/* 状态指示器 */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${config.color.replace('bg-', 'bg-').replace('-100', '-500')}`} />
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        </div>

        {/* 时间信息 */}
        {(material.startDate || material.completedDate) && (
          <div className="mb-3 space-y-1 text-xs text-gray-500">
            {material.startDate && (
              <div className="flex items-center space-x-1">
                <CalendarIcon className="w-3 h-3" />
                <span>开始：{formatDateTime(material.startDate)}</span>
              </div>
            )}
            {material.completedDate && (
              <div className="flex items-center space-x-1">
                <CheckCircleIcon className="w-3 h-3" />
                <span>完成：{formatDateTime(material.completedDate)}</span>
              </div>
            )}
          </div>
        )}

        {/* 备注 */}
        {material.notes && (
          <div className="mb-3 p-2 bg-white bg-opacity-50 rounded text-xs">
            {material.notes}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusChange(material.id, material.status)}
            className="flex-1"
          >
            切换状态
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditMaterial(material)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          {onMaterialDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMaterialDelete(material.id)}
              className="text-red-600 hover:text-red-700"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }, [selectedMaterials, enableBatchOperations, handleStatusChange, handleEditMaterial, onMaterialDelete]);

  // 统计信息
  const statistics = React.useMemo(() => {
    const stats = {
      total: filteredMaterials.length,
      pending: 0,
      in_progress: 0,
      completed: 0
    };

    filteredMaterials.forEach(material => {
      stats[material.status]++;
    });

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return { ...stats, completionRate };
  }, [filteredMaterials]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <TagIcon className="w-5 h-5 mr-2" />
            板材状态管理
          </h2>
          
          {/* 统计信息 */}
          <div className="flex items-center space-x-3 text-sm">
            <Badge variant="secondary">总计 {statistics.total}</Badge>
            <Badge variant="success">完成 {statistics.completed}</Badge>
            <Badge variant="info">进行中 {statistics.in_progress}</Badge>
            <Badge variant="warning">待处理 {statistics.pending}</Badge>
          </div>
          
          {/* 完成率 */}
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">完成率: {statistics.completionRate}%</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center space-x-2">
          {/* 音效开关 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            
          >
            {soundEnabled ? (
              <SpeakerWaveIcon className="w-4 h-4" />
            ) : (
              <SpeakerXMarkIcon className="w-4 h-4" />
            )}
          </Button>

          {/* 批量操作 */}
          {enableBatchOperations && selectedMaterials.size > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="info">已选择 {selectedMaterials.size} 项</Badge>
              <Button variant="secondary" size="sm" onClick={() => handleBatchStatusChange('pending')}>
                批量设为待处理
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleBatchStatusChange('completed')}>
                批量完成
              </Button>
              <Button variant="danger" size="sm" onClick={handleBatchDelete}>
                批量删除
              </Button>
            </div>
          )}

          {/* 添加按钮 */}
          {showAddButton && onMaterialAdd && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              添加材料
            </Button>
          )}
        </div>
      </div>

      {/* 材料展示区域 */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {Object.entries(groupedMaterials).map(([groupName, groupMaterials]) => (
            <motion.div
              key={groupName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 last:mb-0"
            >
              {/* 分组标题 */}
              {groupBy !== 'none' && (
                <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {groupName} ({groupMaterials.length})
                </h3>
              )}

              {/* 材料网格/列表 */}
              {displayMode === 'grid' && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {groupMaterials.map(material => (
                    <div key={material.id}>
                      {renderStatusButton(material)}
                    </div>
                  ))}
                </div>
              )}

              {displayMode === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupMaterials.map(material => renderMaterialCard(material))}
                </div>
              )}

              {displayMode === 'compact' && (
                <div className="space-y-2">
                  {groupMaterials.map(material => {
                    const config = statusConfig[material.status];
                    return (
                      <div
                        key={material.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${config.borderColor} ${config.color}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${config.color.replace('bg-', 'bg-').replace('-100', '-500')}`} />
                          <span className="font-medium">
                            {getMaterialCode(material.materialType)}{parseFloat(material.thickness)}
                          </span>
                          <span className="text-sm text-gray-600">{material.projectName}</span>
                          {material.assignedWorker && (
                            <span className="text-sm text-gray-500">{material.assignedWorker.name}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" size="sm">
                            {config.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(material.id, material.status)}
                          >
                            切换
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {displayMode === 'mini' && (
                <div className="flex flex-wrap gap-2">
                  {groupMaterials.map(material => {
                    const config = statusConfig[material.status];
                    const materialCode = getMaterialCode(material.materialType);
                    const displayText = `${materialCode}${parseFloat(material.thickness)}`;
                    
                    return (
                      <motion.button
                        key={`${material.id}-mini`}
                        type="button"
                        className={`
                          relative px-2 py-1 rounded-md text-xs font-medium transition-all duration-200
                          ${config.color} ${config.textColor} ${config.borderColor}
                          border hover:scale-110 active:scale-90
                          focus:outline-none focus:ring-1 focus:ring-blue-400
                          min-w-[2rem] h-6
                        `}
                        onClick={() => handleStatusChange(material.id, material.status)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        
                      >
                        <span className="font-bold">{displayText}</span>
                        {material.priority && material.priority !== 'low' && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 空状态 */}
        {filteredMaterials.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TagIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无材料</h3>
            <p className="text-gray-500 mb-4">还没有任何材料记录</p>
            {showAddButton && onMaterialAdd && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                添加第一个材料
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 编辑材料模态框 */}
      {showEditModal && editingMaterial && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingMaterial(null);
          }}
          
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMaterial(null);
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (editingMaterial) {
                    onMaterialUpdate?.(editingMaterial.id, {
                      notes: editingMaterial.notes,
                      priority: editingMaterial.priority
                    });
                  }
                  setShowEditModal(false);
                  setEditingMaterial(null);
                  playSound('success');
                }}
              >
                保存
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">材料备注</label>
              <textarea
                value={editingMaterial.notes || ''}
                onChange={(e) => setEditingMaterial({
                  ...editingMaterial,
                  notes: e.target.value
                })}
                placeholder="添加材料备注..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select
                value={editingMaterial.priority || 'low'}
                onChange={(e) => setEditingMaterial({
                  ...editingMaterial,
                  priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">低优先级</option>
                <option value="medium">中等优先级</option>
                <option value="high">高优先级</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MaterialStatusManager;
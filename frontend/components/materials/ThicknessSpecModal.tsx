'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Input, Select, Button, Modal, useDialog, Switch, Loading } from '@/components/ui';
import { apiRequest } from '@/utils/api';

interface ThicknessSpec {
  id: number;
  thickness: string;
  unit: string;
  materialType: string;
  isActive: boolean;
  sortOrder: number;
}

interface ThicknessSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // 更新后的回调
}

export const ThicknessSpecModal: React.FC<ThicknessSpecModalProps> = ({
  isOpen,
  onClose,
  onUpdate
}) => {
  const [thicknessSpecs, setThicknessSpecs] = useState<ThicknessSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingSpec, setEditingSpec] = useState<ThicknessSpec | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { token } = useAuth();

  // Dialog hook
  const { confirm, DialogRenderer } = useDialog();

  // 新增/编辑表单状态
  const [formData, setFormData] = useState({
    thickness: '',
    unit: 'mm',
    materialType: '钢板',
    isActive: true,
    sortOrder: 0
  });

  // 获取厚度规格列表
  const fetchThicknessSpecs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiRequest('/api/thickness-specs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('获取厚度规格失败');
      }

      const data = await response.json();
      const specs = (data.thicknessSpecs || []).sort((a: ThicknessSpec, b: ThicknessSpec) => a.sortOrder - b.sortOrder);
      setThicknessSpecs(specs);

    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 模态框打开时获取数据
  useEffect(() => {
    if (isOpen) {
      fetchThicknessSpecs();
    }
  }, [isOpen]);

  // 创建厚度规格
  const handleCreate = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest('/api/thickness-specs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          sortOrder: thicknessSpecs.length
        }),
      });

      if (response.ok) {
        setIsCreating(false);
        setFormData({ thickness: '', unit: 'mm', materialType: '钢板', isActive: true, sortOrder: 0 });
        await fetchThicknessSpecs();
        onUpdate(); // 通知父组件更新
      } else {
        const errorData = await response.json();
        setError('创建失败: ' + (errorData.message || '未知错误'));
      }
    } catch (error) {
      setError('创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新厚度规格
  const handleUpdate = async () => {
    if (!editingSpec) return;
    
    try {
      setLoading(true);
      
      const response = await apiRequest(`/api/thickness-specs/${editingSpec.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEditingSpec(null);
        setFormData({ thickness: '', unit: 'mm', materialType: '钢板', isActive: true, sortOrder: 0 });
        await fetchThicknessSpecs();
        onUpdate(); // 通知父组件更新
      } else {
        const errorData = await response.json();
        setError('更新失败: ' + (errorData.message || '未知错误'));
      }
    } catch (error) {
      setError('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除厚度规格
  const handleDelete = async (id: number) => {
    const confirmed = await confirm('确定要删除这个厚度规格吗？\n注意：如果有项目正在使用此规格，删除将失败。');
    if (!confirmed) return;
    
    try {
      setLoading(true);
      setError(''); // 清除之前的错误
      
      const response = await apiRequest(`/api/thickness-specs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();

      if (response.ok) {
        await fetchThicknessSpecs();
        onUpdate(); // 通知父组件更新
      } else {
        // 显示服务器返回的具体错误信息
        setError(result.error || '删除失败');
      }
    } catch (error) {
      setError('删除失败：网络连接错误');
    } finally {
      setLoading(false);
    }
  };

  // 开始编辑
  const startEdit = (spec: ThicknessSpec) => {
    setEditingSpec(spec);
    setFormData({
      thickness: spec.thickness,
      unit: spec.unit,
      materialType: spec.materialType,
      isActive: spec.isActive,
      sortOrder: spec.sortOrder
    });
    setIsCreating(false);
  };

  // 开始创建
  const startCreate = () => {
    setIsCreating(true);
    setEditingSpec(null);
    setFormData({ thickness: '', unit: 'mm', materialType: '钢板', isActive: true, sortOrder: thicknessSpecs.length });
  };

  // 取消操作
  const handleCancel = () => {
    setIsCreating(false);
    setEditingSpec(null);
    setFormData({ thickness: '', unit: 'mm', materialType: '钢板', isActive: true, sortOrder: 0 });
    setError('');
  };

  // 调整排序
  const moveSpec = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = thicknessSpecs.findIndex(spec => spec.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= thicknessSpecs.length) return;

    try {
      setLoading(true);
      
      // 交换排序值
      const updates = [
        { id: thicknessSpecs[currentIndex].id, sortOrder: newIndex },
        { id: thicknessSpecs[newIndex].id, sortOrder: currentIndex }
      ];

      await Promise.all(updates.map(update => 
        apiRequest(`/api/thickness-specs/${update.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ sortOrder: update.sortOrder }),
        })
      ));

      await fetchThicknessSpecs();
      onUpdate(); // 通知父组件更新
    } catch (error) {
      setError('调整顺序失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* 模态框内容 */}
        <motion.div
          className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          {/* 头部 */}
          <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/60 to-white/40">
            <div className="flex items-center justify-between">
              <h2 className="text-title2 font-semibold text-text-primary">
                板材厚度规格管理
              </h2>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={startCreate}
                  className="bg-gradient-to-r from-ios18-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md active:scale-95"
                  size="sm"
                >
                  新增规格
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-callout">
                {error}
              </div>
            )}

            {/* 新增/编辑表单 */}
            {(isCreating || editingSpec) && (
              <div className="mb-6 p-4 bg-blue-50/50 border border-blue-200/50 rounded-xl">
                <h3 className="text-headline font-semibold text-text-primary mb-4">
                  {isCreating ? '新增厚度规格' : '编辑厚度规格'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-callout font-medium text-gray-700 mb-1">厚度</label>
                    <Input
                      type="text"
                      value={formData.thickness}
                      onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                      placeholder="如: 1.0"
                    />
                  </div>
                  <div>
                    <label className="block text-callout font-medium text-gray-700 mb-1">单位</label>
                    <Select
                      value={formData.unit}
                      onChange={(value) => setFormData({ ...formData, unit: String(value) })}
                      options={[
                        { value: 'mm', label: 'mm' },
                        { value: 'cm', label: 'cm' },
                        { value: 'inch', label: 'inch' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-callout font-medium text-gray-700 mb-1">材料类型</label>
                    <Select
                      value={formData.materialType}
                      onChange={(value) => setFormData({ ...formData, materialType: String(value) })}
                      options={[
                        { value: '钢板', label: '钢板' },
                        { value: '不锈钢', label: '不锈钢' },
                        { value: '铝板', label: '铝板' },
                        { value: '铜板', label: '铜板' },
                        { value: '其他', label: '其他' }
                      ]}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.isActive}
                        onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <span className="text-callout font-medium text-gray-700">启用</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 mt-4">
                  <Button
                    onClick={isCreating ? handleCreate : handleUpdate}
                    disabled={loading || !formData.thickness}
                    variant="success"
                  >
                    {loading ? '保存中...' : (isCreating ? '创建' : '更新')}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="secondary"
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}

            {/* 厚度规格列表 */}
            <div className="space-y-3">
              <h3 className="text-headline font-semibold text-text-primary">
                现有规格列表 ({thicknessSpecs.length}个)
              </h3>
              
              {loading && thicknessSpecs.length === 0 ? (
                <div className="text-center py-8">
                  <Loading size="md" text="加载中..." />
                </div>
              ) : thicknessSpecs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-callout text-gray-500">暂无厚度规格，请先添加</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {thicknessSpecs.map((spec, index) => (
                    <motion.div
                      key={spec.id}
                      className="flex items-center justify-between p-4 bg-white/60 border border-gray-200/50 rounded-xl hover:bg-white/80 transition-all duration-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex flex-col space-y-1">
                          <Button
                            onClick={() => moveSpec(spec.id, 'up')}
                            disabled={index === 0 || loading}
                            variant="ghost"
                            size="sm"
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed h-auto"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </Button>
                          <Button
                            onClick={() => moveSpec(spec.id, 'down')}
                            disabled={index === thicknessSpecs.length - 1 || loading}
                            variant="ghost"
                            size="sm"
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed h-auto"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </Button>
                        </div>
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-caption1 font-semibold text-gray-700">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-callout text-gray-900">
                            {spec.thickness}{spec.unit} - {spec.materialType}
                          </div>
                          <div className="text-caption1 text-gray-500">
                            排序: {spec.sortOrder} | 状态: {spec.isActive ? '启用' : '禁用'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => startEdit(spec)}
                          variant="ghost"
                          size="sm"
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg h-auto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          onClick={() => handleDelete(spec.id)}
                          variant="ghost"
                          size="sm"
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg h-auto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        <DialogRenderer />
      </motion.div>
    </AnimatePresence>
  );
};
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal, Button, Input, Badge } from './';
import { ArrowsUpDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SortItem {
  id: number;
  name: string;
  currentPosition: number;
  newPosition?: number;
}

interface BatchSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SortItem[];
  onSave: (reorderedItems: SortItem[]) => Promise<void>;
  title?: string;
}

export const BatchSortModal: React.FC<BatchSortModalProps> = ({
  isOpen,
  onClose,
  items,
  onSave,
  title = '批量调整排序'
}) => {
  const [sortItems, setSortItems] = useState<SortItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化数据
  useEffect(() => {
    if (isOpen) {
      setSortItems(items.map(item => ({ ...item, newPosition: item.currentPosition })));
      setHasChanges(false);
    }
  }, [isOpen, items]);

  // 检查是否有更改
  useEffect(() => {
    const changed = sortItems.some(item => item.newPosition !== item.currentPosition);
    setHasChanges(changed);
  }, [sortItems]);

  // 更新单个项目的新位置
  const updatePosition = (id: number, newPosition: string) => {
    const pos = parseInt(newPosition);
    if (isNaN(pos) || pos < 1 || pos > items.length) return;

    setSortItems(prev => prev.map(item => 
      item.id === id ? { ...item, newPosition: pos } : item
    ));
  };

  // 重置位置
  const resetPosition = (id: number) => {
    setSortItems(prev => prev.map(item => 
      item.id === id ? { ...item, newPosition: item.currentPosition } : item
    ));
  };

  // 自动排序 - 按字母顺序
  const sortAlphabetically = () => {
    const sorted = [...sortItems].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    setSortItems(sorted.map((item, index) => ({ ...item, newPosition: index + 1 })));
  };

  // 反向排序
  const reverseOrder = () => {
    setSortItems(prev => prev.map((item, index) => ({
      ...item,
      newPosition: prev.length - index
    })));
  };

  // 保存排序
  const handleSave = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      // 按新位置排序项目
      const reorderedItems = [...sortItems].sort((a, b) => (a.newPosition || 0) - (b.newPosition || 0));
      await onSave(reorderedItems);
      onClose();
    } catch (error) {
      console.error('保存排序失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取位置冲突的项目
  const getConflictingPositions = () => {
    const positionCounts = new Map<number, number>();
    sortItems.forEach(item => {
      if (item.newPosition) {
        positionCounts.set(item.newPosition, (positionCounts.get(item.newPosition) || 0) + 1);
      }
    });
    return Array.from(positionCounts.entries()).filter(([, count]) => count > 1).map(([pos]) => pos);
  };

  const conflictingPositions = getConflictingPositions();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={sortAlphabetically}
              className="flex items-center space-x-1"
            >
              <span>按字母排序</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={reverseOrder}
              className="flex items-center space-x-1"
            >
              <span>反向排序</span>
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading || !hasChanges || conflictingPositions.length > 0}
              className="flex items-center space-x-1"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{loading ? '保存中...' : '保存排序'}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-blue-700">
            <ArrowsUpDownIcon className="w-5 h-5" />
            <span className="font-medium">批量排序说明</span>
          </div>
          <div className="mt-2 text-sm text-blue-600">
            <ul className="list-disc list-inside space-y-1">
              <li>在右侧输入框中输入新的位置序号（1-{items.length}）</li>
              <li>可以使用快捷按钮进行字母排序或反向排序</li>
              <li>修改后的项目会显示变更标识</li>
              <li>确保没有位置冲突后点击保存</li>
            </ul>
          </div>
        </div>

        {/* 冲突警告 */}
        {conflictingPositions.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-red-700 font-medium">位置冲突</div>
            <div className="text-sm text-red-600 mt-1">
              以下位置有多个项目：{conflictingPositions.join(', ')}。请调整后再保存。
            </div>
          </div>
        )}

        {/* 项目列表 */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortItems.map((item) => {
            const isChanged = item.newPosition !== item.currentPosition;
            const hasConflict = item.newPosition && conflictingPositions.includes(item.newPosition);
            
            return (
              <motion.div
                key={item.id}
                className={`border rounded-lg p-3 ${hasConflict ? 'border-red-300 bg-red-50' : isChanged ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                layout
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Badge variant={hasConflict ? 'danger' : isChanged ? 'primary' : 'secondary'}>
                      {item.currentPosition}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {isChanged && (
                        <div className="text-xs text-blue-600">
                          {item.currentPosition} → {item.newPosition}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isChanged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resetPosition(item.id)}
                        className="p-1"
                        title="重置位置"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="w-20">
                      <Input
                        type="number"
                        min="1"
                        max={items.length}
                        value={item.newPosition || ''}
                        onChange={(e) => updatePosition(item.id, e.target.value)}
                        className={`text-center ${hasConflict ? 'border-red-300' : ''}`}
                        placeholder="位置"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 状态信息 */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>共 {items.length} 个项目</div>
          {hasChanges && (
            <div className="text-blue-600">
              {sortItems.filter(item => item.newPosition !== item.currentPosition).length} 个项目有变更
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BatchSortModal;
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, PencilIcon } from '@heroicons/react/24/outline';

interface MaterialDimension {
  id: number;
  width: number;
  height: number;
  quantity: number;
  notes?: string;
  dimensionLabel: string;
}

interface MaterialData {
  quantity: number;
  id: number | null;
  notes?: string;
  dimensions: MaterialDimension[];
}

interface ExpandableMaterialCellProps {
  materialKey: string;
  materialData: MaterialData;
  workerId: number;
  onEdit: (materialData: MaterialData) => void;
}

export const ExpandableMaterialCell: React.FC<ExpandableMaterialCellProps> = ({
  materialKey, materialData, workerId, onEdit
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { dimensions = [], quantity: totalQuantity } = materialData;
  const hasDimensions = dimensions.length > 0;

  const getQuantityColor = (quantity: number) => {
    if (quantity === 0) return 'bg-gray-50 text-gray-400';
    if (quantity > 20) return 'bg-green-100 text-green-800';
    if (quantity > 10) return 'bg-yellow-100 text-amber-800';
    return 'bg-orange-100 text-orange-800';
  };

  const handleMainCellClick = () => {
    if (hasDimensions) {
      setIsExpanded(!isExpanded);
    } else if (totalQuantity > 0) {
      // 如果没有尺寸信息但有数量，直接打开编辑模式
      onEdit(materialData);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(materialData);
  };

  return (
    <div className="relative w-full">
      {/* 主要数量显示区域 */}
      <div 
        className={`
          w-full px-3 py-2 rounded-lg font-semibold text-sm shadow-sm 
          transition-all duration-200 cursor-pointer
          ${getQuantityColor(totalQuantity)}
          ${hasDimensions ? 'hover:scale-105' : ''}
          ${isExpanded ? 'rounded-b-none' : ''}
        `}
        onClick={handleMainCellClick}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold">{totalQuantity}张</span>
          <div className="flex items-center space-x-1">
            {/* 编辑按钮 */}
            <button
              onClick={handleEditClick}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title="编辑板材"
            >
              <PencilIcon className="w-3 h-3" />
            </button>
            
            {/* 展开按钮 */}
            {hasDimensions && (
              <ChevronDownIcon 
                className={`w-3 h-3 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`} 
              />
            )}
          </div>
        </div>
      </div>

      {/* 展开的尺寸详情 */}
      <AnimatePresence>
        {isExpanded && hasDimensions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full bg-white border border-t-0 rounded-b-lg shadow-sm overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {/* 尺寸列表 */}
              <div className="space-y-1.5">
                {dimensions.map((dim, index) => (
                  <div 
                    key={dim.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {dim.width}×{dim.height}mm
                      </span>
                      {dim.notes && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          {dim.notes}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {dim.quantity}张
                    </span>
                  </div>
                ))}
              </div>
              
              {/* 操作按钮 */}
              <div className="pt-2 border-t border-gray-200">
                <button 
                  onClick={handleEditClick}
                  className="w-full px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors font-medium"
                >
                  管理尺寸
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpandableMaterialCell;
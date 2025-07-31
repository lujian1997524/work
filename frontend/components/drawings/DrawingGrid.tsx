'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DrawingCard } from './DrawingCard';
import { Drawing } from './DrawingLibrary';

export interface DrawingGridProps {
  drawings: Drawing[];
  selectedDrawings?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  onDelete: (drawing: Drawing) => void;
  onEdit: (drawing: Drawing) => void;
  onPreview: (drawing: Drawing) => void;
  onOpen?: (drawing: Drawing) => void;
  className?: string;
}

export const DrawingGrid: React.FC<DrawingGridProps> = ({
  drawings,
  selectedDrawings = [],
  onSelectionChange,
  onDelete,
  onEdit,
  onPreview,
  onOpen,
  className = ''
}) => {
  // 处理单个图纸选择
  const handleDrawingSelect = (drawingId: number, selected: boolean) => {
    if (!onSelectionChange) return;
    
    if (selected) {
      onSelectionChange([...selectedDrawings, drawingId]);
    } else {
      onSelectionChange(selectedDrawings.filter(id => id !== drawingId));
    }
  };

  // 动画配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className={`overflow-auto h-full ${className}`}>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {drawings.map((drawing) => (
            <motion.div
              key={drawing.id}
              variants={itemVariants}
              layout
              exit="exit"
            >
              <DrawingCard
                drawing={drawing}
                selected={selectedDrawings.includes(drawing.id)}
                onSelect={onSelectionChange ? (selected) => handleDrawingSelect(drawing.id, selected) : undefined}
                onDelete={() => onDelete(drawing)}
                onEdit={() => onEdit(drawing)}
                onPreview={() => onPreview(drawing)}
                onOpen={onOpen ? () => onOpen(drawing) : undefined}
                className="h-full"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
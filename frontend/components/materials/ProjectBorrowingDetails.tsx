import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  UserIcon,
  CalendarDaysIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { Button, Loading } from '../ui';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';

interface BorrowingItem {
  materialType: string;
  thickness: string;
  dimensions: string;
  quantity: number;
  allocatedAt: string;
}

interface BorrowingDetail {
  worker: {
    id: number;
    name: string;
    department: string;
  };
  items: BorrowingItem[];
  totalQuantity: number;
}

interface ProjectBorrowingDetailsProps {
  projectId: number;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectBorrowingDetails: React.FC<ProjectBorrowingDetailsProps> = ({
  projectId,
  projectName,
  isOpen,
  onClose
}) => {
  const { token } = useAuth();
  const { isMobile } = useResponsive();
  const [borrowingDetails, setBorrowingDetails] = useState<BorrowingDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取借用详情
  const fetchBorrowingDetails = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(
        `/api/material-requirements/project/${projectId}/borrowing-details`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBorrowingDetails(data.borrowingDetails || []);
      }
    } catch (error) {
      // 获取借用详情失败
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 生成打印内容
  const generatePrintContent = () => {
    const totalBorrowedQuantity = borrowingDetails.reduce(
      (sum, detail) => sum + detail.totalQuantity, 0
    );

    let content = `项目借用清单\n`;
    content += `项目名称: ${projectName}\n`;
    content += `统计时间: ${new Date().toLocaleString('zh-CN')}\n`;
    content += `总借用量: ${totalBorrowedQuantity} 张\n`;
    content += `涉及人员: ${borrowingDetails.length} 人\n\n`;

    content += `详细记录:\n`;
    content += `${'='.repeat(50)}\n`;

    borrowingDetails.forEach((detail, index) => {
      content += `${index + 1}. ${detail.worker.name} (${detail.worker.department})\n`;
      content += `   借用总量: ${detail.totalQuantity} 张\n\n`;
      
      detail.items.forEach((item, itemIndex) => {
        content += `   ${itemIndex + 1}) ${item.materialType} ${item.thickness}mm\n`;
        content += `      尺寸: ${item.dimensions}\n`;
        content += `      数量: ${item.quantity} 张\n`;
        content += `      时间: ${formatDate(item.allocatedAt)}\n\n`;
      });
      
      content += `${'='.repeat(50)}\n`;
    });

    return content;
  };

  // 导出清单
  const exportList = () => {
    const content = generatePrintContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_借用清单_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isOpen) {
      fetchBorrowingDetails();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <div className={`bg-gray-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
      {/* 头部操作区 */}
      <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'} mb-4`}>
        <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
          项目板材借用情况概览
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={exportList}
          disabled={loading || borrowingDetails.length === 0}
          className="flex items-center space-x-1"
        >
          <ArchiveBoxIcon className="w-4 h-4" />
          <span>{isMobile ? '导出' : '导出清单'}</span>
        </Button>
      </div>

      <div>
        {loading ? (
          <div className="text-center py-8">
            <Loading text="加载借用详情中..." />
          </div>
        ) : borrowingDetails.length === 0 ? (
          <div className="text-center py-8">
            <ArchiveBoxIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-900 mb-1`}>
              暂无借用记录
            </h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
              此项目当前没有向其他工人借用板材
            </p>
          </div>
        ) : (
          <>
            {/* 汇总信息 - 移动端适配 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-3 gap-4'} text-center`}>
                <div>
                  <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-blue-900`}>
                    {borrowingDetails.reduce((sum, detail) => sum + detail.totalQuantity, 0)}
                  </div>
                  <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-blue-700`}>总借用量 (张)</div>
                </div>
                <div>
                  <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-blue-900`}>
                    {borrowingDetails.length}
                  </div>
                  <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-blue-700`}>出借人数</div>
                </div>
                {!isMobile && (
                  <div>
                    <div className="text-xl font-bold text-blue-900">
                      {borrowingDetails.reduce((sum, detail) => sum + detail.items.length, 0)}
                    </div>
                    <div className="text-xs text-blue-700">借用记录条数</div>
                  </div>
                )}
              </div>
            </div>

            {/* 详细借用记录 - 移动端卡片式布局 */}
            <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-3'}`}>
              {borrowingDetails.map((detail, index) => (
                <div key={detail.worker.id} className="border rounded-lg overflow-hidden bg-white">
                  {/* 工人信息头部 */}
                  <div className={`bg-gray-50 ${isMobile ? 'px-3 py-2' : 'px-3 py-2'} border-b`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>{detail.worker.name}</h4>
                          <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-600`}>{detail.worker.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-gray-900`}>
                          {detail.totalQuantity} 张
                        </div>
                        <div className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>
                          {detail.items.length} 项记录
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 借用项目列表 - 移动端简化 */}
                  <div className={isMobile ? 'p-2' : 'p-3'}>
                    <div className={`space-y-${isMobile ? '1' : '2'}`}>
                      {detail.items.map((item, itemIndex) => (
                        <div key={itemIndex} className={`${isMobile ? 'p-2' : 'p-2'} bg-gray-50 rounded text-sm`}>
                          {isMobile ? (
                            // 移动端：垂直布局
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-900">
                                  {item.materialType} {item.thickness}mm
                                </span>
                                <span className="text-xs font-semibold text-blue-600">
                                  {item.quantity} 张
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {item.dimensions}
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <CalendarDaysIcon className="w-3 h-3" />
                                <span>{formatDate(item.allocatedAt)}</span>
                              </div>
                            </div>
                          ) : (
                            // 桌面端：水平布局
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <span className="font-medium text-gray-900">
                                    {item.materialType} {item.thickness}mm
                                  </span>
                                  <span className="text-gray-600">
                                    {item.dimensions}
                                  </span>
                                  <span className="font-semibold text-blue-600">
                                    {item.quantity} 张
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                                  <CalendarDaysIcon className="w-3 h-3" />
                                  <span>{formatDate(item.allocatedAt)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
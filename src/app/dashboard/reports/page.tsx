'use client';

import { useState, useEffect } from 'react';
import { PageTransition } from '@/components/ui/LoadingState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ApiErrorState } from '@/components/ui/ErrorState';
import { toast } from '@/components/ui/Notifications';

interface ReportData {
  customersByStatus: {
    status: string;
    count: number;
  }[];
  salesByMonth: {
    month: string;
    total: number;
  }[];
  tasksByStatus: {
    status: string;
    count: number;
  }[];
}

const defaultReportData: ReportData = {
  customersByStatus: [],
  salesByMonth: [],
  tasksByStatus: []
};

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData>(defaultReportData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/reports');
        
        // 检查内容类型
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('服务器返回了HTML而不是JSON数据，请检查API实现');
        }
        
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || '获取报表数据失败');
        }
        
        const data = await res.json().catch(() => {
          throw new Error('无法解析JSON响应');
        });
        
        // 验证并应用数据
        setReportData({
          customersByStatus: Array.isArray(data.customersByStatus) ? data.customersByStatus : [],
          salesByMonth: Array.isArray(data.salesByMonth) ? data.salesByMonth : [],
          tasksByStatus: Array.isArray(data.tasksByStatus) ? data.tasksByStatus : []
        });
        
        setError('');
      } catch (err: any) {
        console.error('Reports fetch error:', err);
        setError(err.message || '加载报表数据时发生错误');
        toast.error({
          title: '加载失败',
          message: err.message || '加载报表数据时发生错误',
        });
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    };

    fetchReportData();
  }, [isRetrying]);

  const handleRetry = () => {
    setIsRetrying(true);
    setError('');
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'LEAD': return '潜在客户';
      case 'PROSPECT': return '意向客户';
      case 'CUSTOMER': return '成交客户';
      case 'CHURNED': return '流失客户';
      case 'PENDING': return '待处理';
      case 'IN_PROGRESS': return '进行中';
      case 'COMPLETED': return '已完成';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingState size="lg" text="加载报表数据..." />
      </div>
    );
  }

  if (error) {
    return (
      <ApiErrorState
        title="加载报表错误"
        message={error}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-8">报表分析</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 客户状态分析 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">客户状态分析</h2>
            {reportData.customersByStatus.length > 0 ? (
              <div className="space-y-4">
                {reportData.customersByStatus.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{getStatusName(item.status)}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (item.count / Math.max(...reportData.customersByStatus.map(i => i.count))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">暂无客户数据</p>
            )}
          </div>
          
          {/* 任务状态分析 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">任务状态分析</h2>
            {reportData.tasksByStatus.length > 0 ? (
              <div className="space-y-4">
                {reportData.tasksByStatus.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{getStatusName(item.status)}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (item.count / Math.max(...reportData.tasksByStatus.map(i => i.count))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">暂无任务数据</p>
            )}
          </div>
        </div>
        
        {/* 月度销售趋势 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">月度销售趋势</h2>
          {reportData.salesByMonth.length > 0 ? (
            <div className="h-64 relative">
              {/* 简单的柱状图示例 */}
              <div className="flex h-full items-end space-x-2">
                {reportData.salesByMonth.map((item, index) => {
                  const maxValue = Math.max(...reportData.salesByMonth.map(i => i.total));
                  const height = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-indigo-500 rounded-t-sm"
                        style={{ height: `${height}%` }}
                      ></div>
                      <div className="text-xs mt-2 text-gray-600">{item.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">暂无销售数据</p>
          )}
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>数据最后更新时间: {new Date().toLocaleString('zh-CN')}</p>
        </div>
      </div>
    </PageTransition>
  );
} 
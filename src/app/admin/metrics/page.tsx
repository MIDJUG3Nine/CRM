'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiAlertCircle, FiClock, FiRefreshCcw, FiServer, FiUsers } from 'react-icons/fi';

// 定义指标数据类型
interface MetricsData {
  timestamp: string;
  apiPerformance: {
    overview: Record<string, { count: number, avgDuration: number, errorRate: number }>;
    slowestEndpoints: Array<{ endpoint: string, avgDuration: number }>;
    errorProneEndpoints: Array<{ endpoint: string, errorRate: number, errorCount: number }>;
  };
  websocketStats: {
    totalUsers: number;
    totalConnections: number;
    userDetails: Record<string, number>;
    messagingStats: {
      totalMessagesProcessed: number;
      failedMessages: number;
      successRate: string;
    };
    uptime: string;
    connectionRates: {
      perMinute: number;
      perHour: number;
    };
  };
  databaseStats: {
    timeRange: string;
    apiRequests: {
      total: number;
      errorCount: number;
      errorRate: string;
      slowRequests: Array<{ path: string, method: string, statusCode: number, duration: number, timestamp: string }>;
      errorRequests: Array<{ path: string, method: string, statusCode: number, duration: number, timestamp: string }>;
    };
    logStats: Record<string, number>;
    period: {
      start: string;
      end: string;
    };
  };
}

export default function MetricsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  
  // 加载指标数据
  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/metrics?timeRange=${timeRange}`);
      setMetrics(response.data);
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError(err.response?.data?.error || 'Failed to load metrics');
      
      // 如果是权限错误，重定向到首页
      if (err.response?.status === 403) {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载和时间范围变更时重新加载
  useEffect(() => {
    fetchMetrics();
    
    // 设置自动刷新（每60秒）
    const refreshInterval = setInterval(fetchMetrics, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [timeRange]);
  
  // 格式化持续时间
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  // 格式化时间戳
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };
  
  if (loading && !metrics) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="mt-4">Loading metrics...</span>
        </div>
      </div>
    );
  }
  
  if (error && !metrics) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        <div className="flex flex-col items-center">
          <FiAlertCircle size={40} />
          <span className="mt-4">{error}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">系统性能监控</h1>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">过去1小时</option>
            <option value="6h">过去6小时</option>
            <option value="24h">过去24小时</option>
            <option value="7d">过去7天</option>
            <option value="30d">过去30天</option>
          </select>
          <button
            onClick={fetchMetrics}
            className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-md"
          >
            <FiRefreshCcw className="mr-2" />
            刷新
          </button>
        </div>
      </div>
      
      {metrics && (
        <div className="space-y-8">
          {/* 概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* API请求统计 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <FiServer className="mr-3 text-blue-500" size={24} />
                <h2 className="text-lg font-semibold">API请求</h2>
              </div>
              <div className="mt-4 space-y-2">
                <p>总请求数: <span className="font-bold">{metrics.databaseStats.apiRequests.total}</span></p>
                <p>错误率: <span className={`font-bold ${parseFloat(metrics.databaseStats.apiRequests.errorRate) > 5 ? 'text-red-500' : 'text-green-500'}`}>{metrics.databaseStats.apiRequests.errorRate}</span></p>
                <p>慢响应数: <span className="font-bold">{metrics.databaseStats.apiRequests.slowRequests.length}</span></p>
              </div>
            </div>
            
            {/* WebSocket统计 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <FiUsers className="mr-3 text-green-500" size={24} />
                <h2 className="text-lg font-semibold">WebSocket</h2>
              </div>
              <div className="mt-4 space-y-2">
                <p>活跃用户: <span className="font-bold">{metrics.websocketStats.totalUsers}</span></p>
                <p>总连接数: <span className="font-bold">{metrics.websocketStats.totalConnections}</span></p>
                <p>消息成功率: <span className="font-bold text-green-500">{metrics.websocketStats.messagingStats.successRate}</span></p>
              </div>
            </div>
            
            {/* 日志统计 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <FiClock className="mr-3 text-purple-500" size={24} />
                <h2 className="text-lg font-semibold">日志统计</h2>
              </div>
              <div className="mt-4 space-y-2">
                <p>INFO: <span className="font-bold">{metrics.databaseStats.logStats['INFO'] || 0}</span></p>
                <p>WARN: <span className="font-bold text-yellow-500">{metrics.databaseStats.logStats['WARN'] || 0}</span></p>
                <p>ERROR: <span className="font-bold text-red-500">{metrics.databaseStats.logStats['ERROR'] || 0}</span></p>
              </div>
            </div>
          </div>
          
          {/* 性能数据详情 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 最慢端点 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">最慢的API端点</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">端点</th>
                      <th className="py-2 text-left">平均响应时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.apiPerformance.slowestEndpoints.map((endpoint, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2">{endpoint.endpoint}</td>
                        <td className="py-2">{formatDuration(endpoint.avgDuration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 错误率最高端点 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">错误率最高的API端点</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">端点</th>
                      <th className="py-2 text-left">错误率</th>
                      <th className="py-2 text-left">错误数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.apiPerformance.errorProneEndpoints.map((endpoint, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2">{endpoint.endpoint}</td>
                        <td className="py-2">{(endpoint.errorRate * 100).toFixed(2)}%</td>
                        <td className="py-2">{endpoint.errorCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* 最近慢请求 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">最近慢响应请求</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">路径</th>
                    <th className="py-2 text-left">方法</th>
                    <th className="py-2 text-left">状态码</th>
                    <th className="py-2 text-left">响应时间</th>
                    <th className="py-2 text-left">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.databaseStats.apiRequests.slowRequests.map((request, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2">{request.path}</td>
                      <td className="py-2">{request.method}</td>
                      <td className="py-2">{request.statusCode}</td>
                      <td className="py-2">{formatDuration(request.duration)}</td>
                      <td className="py-2">{formatTimestamp(request.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 最近错误请求 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">最近错误响应请求</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">路径</th>
                    <th className="py-2 text-left">方法</th>
                    <th className="py-2 text-left">状态码</th>
                    <th className="py-2 text-left">响应时间</th>
                    <th className="py-2 text-left">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.databaseStats.apiRequests.errorRequests.map((request, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2">{request.path}</td>
                      <td className="py-2">{request.method}</td>
                      <td className="py-2">{request.statusCode}</td>
                      <td className="py-2">{formatDuration(request.duration)}</td>
                      <td className="py-2">{formatTimestamp(request.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="text-right text-gray-500 text-sm">
            最后更新: {formatTimestamp(metrics.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
} 
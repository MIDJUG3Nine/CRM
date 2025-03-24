/**
 * API性能监控工具
 * 用于记录和分析API性能指标
 */
import { prisma } from './prisma';
import { logger } from './logger';

// 存储端点性能数据
interface EndpointPerformance {
  count: number;
  totalDuration: number;
  maxDuration: number;
  minDuration: number;
  errors: number;
  lastTimestamp: number;
}

// 存储API指标数据
const apiMetrics: Map<string, EndpointPerformance> = new Map();

// 清理间隔（毫秒）
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1小时

// 保存到数据库的阈值
const SAVE_THRESHOLD = 100;

// 慢响应阈值（毫秒）
const SLOW_RESPONSE_THRESHOLD = 1000;

/**
 * 记录API请求性能
 */
export function recordApiPerformance(
  path: string,
  method: string,
  statusCode: number,
  duration: number
) {
  const key = `${method}:${path}`;
  const now = Date.now();
  
  // 获取或创建端点性能数据
  const metrics = apiMetrics.get(key) || {
    count: 0,
    totalDuration: 0,
    maxDuration: 0,
    minDuration: Infinity,
    errors: 0,
    lastTimestamp: now
  };
  
  // 更新性能数据
  metrics.count += 1;
  metrics.totalDuration += duration;
  metrics.maxDuration = Math.max(metrics.maxDuration, duration);
  metrics.minDuration = Math.min(metrics.minDuration, duration);
  metrics.lastTimestamp = now;
  
  if (statusCode >= 400) {
    metrics.errors += 1;
  }
  
  // 存储更新后的数据
  apiMetrics.set(key, metrics);
  
  // 记录慢响应
  if (duration > SLOW_RESPONSE_THRESHOLD) {
    logger.warn(`Slow API response: ${method} ${path}`, {
      duration: `${duration.toFixed(2)}ms`,
      statusCode,
    });
  }
  
  // 如果请求数量超过阈值，保存到数据库
  if (metrics.count % SAVE_THRESHOLD === 0) {
    saveMetricsToDatabase(key, metrics, statusCode, duration);
  }
}

/**
 * 保存指标到数据库
 */
async function saveMetricsToDatabase(
  key: string,
  metrics: EndpointPerformance,
  statusCode: number,
  duration: number
) {
  const [method, path] = key.split(':', 2);
  
  try {
    await prisma.aPIMetric.create({
      data: {
        path,
        method,
        statusCode,
        duration: Math.round(duration),
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to save API metrics to database', {
      key,
      error: (error as Error).message
    });
  }
}

/**
 * 清理过期的性能数据
 */
function cleanupOldMetrics() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24小时
  
  for (const [key, metrics] of apiMetrics.entries()) {
    if (now - metrics.lastTimestamp > maxAge) {
      apiMetrics.delete(key);
    }
  }
}

/**
 * 获取API性能概览
 */
export function getApiPerformanceOverview() {
  const overview: Record<string, {
    count: number,
    avgDuration: number,
    errorRate: number
  }> = {};
  
  for (const [key, metrics] of apiMetrics.entries()) {
    overview[key] = {
      count: metrics.count,
      avgDuration: metrics.totalDuration / metrics.count,
      errorRate: metrics.errors / metrics.count
    };
  }
  
  return overview;
}

/**
 * 获取最慢的端点
 */
export function getSlowestEndpoints(limit: number = 5) {
  const endpoints = Array.from(apiMetrics.entries())
    .map(([key, metrics]) => ({
      endpoint: key,
      avgDuration: metrics.totalDuration / metrics.count
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, limit);
  
  return endpoints;
}

/**
 * 获取错误率最高的端点
 */
export function getErrorProneEndpoints(limit: number = 5) {
  const endpoints = Array.from(apiMetrics.entries())
    .map(([key, metrics]) => ({
      endpoint: key,
      errorRate: metrics.count > 0 ? metrics.errors / metrics.count : 0,
      errorCount: metrics.errors
    }))
    .filter(endpoint => endpoint.errorRate > 0)
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, limit);
  
  return endpoints;
}

// 定期清理过期数据
setInterval(cleanupOldMetrics, CLEANUP_INTERVAL); 
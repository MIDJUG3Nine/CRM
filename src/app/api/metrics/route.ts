import { NextRequest, NextResponse } from 'next/server';
import { getApiPerformanceOverview, getSlowestEndpoints, getErrorProneEndpoints } from '@/lib/metrics';
import { getConnectionStats } from '@/lib/websocket';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * 获取系统性能指标
 * 仅限管理员访问
 */
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份和权限
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 只允许管理员访问
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // 获取时间范围参数
    const url = new URL(req.url);
    const timeRange = url.searchParams.get('timeRange') || '24h';
    
    // 构建响应数据
    const metricsData = {
      timestamp: new Date().toISOString(),
      apiPerformance: {
        overview: getApiPerformanceOverview(),
        slowestEndpoints: getSlowestEndpoints(10),
        errorProneEndpoints: getErrorProneEndpoints(10)
      },
      websocketStats: getConnectionStats(),
      databaseStats: await getDatabaseStats(timeRange)
    };
    
    return NextResponse.json(metricsData);
  } catch (error) {
    console.error('Error retrieving metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

/**
 * 获取数据库统计信息
 */
async function getDatabaseStats(timeRange: string) {
  // 根据时间范围确定时间点
  const now = new Date();
  let startDate = new Date(now);
  
  switch (timeRange) {
    case '1h':
      startDate.setHours(now.getHours() - 1);
      break;
    case '6h':
      startDate.setHours(now.getHours() - 6);
      break;
    case '24h':
    default:
      startDate.setDate(now.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
  }
  
  // 获取API指标数据
  const apiMetricsCount = await prisma.aPIMetric.count({
    where: {
      timestamp: {
        gte: startDate
      }
    }
  });
  
  // 获取慢响应API请求
  const slowRequests = await prisma.aPIMetric.findMany({
    where: {
      timestamp: {
        gte: startDate
      },
      duration: {
        gte: 1000 // 大于1秒的请求
      }
    },
    orderBy: {
      duration: 'desc'
    },
    take: 10,
    select: {
      path: true,
      method: true,
      statusCode: true,
      duration: true,
      timestamp: true
    }
  });
  
  // 获取错误响应
  const errorRequests = await prisma.aPIMetric.findMany({
    where: {
      timestamp: {
        gte: startDate
      },
      statusCode: {
        gte: 400 // 所有错误响应
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 10,
    select: {
      path: true,
      method: true,
      statusCode: true,
      duration: true,
      timestamp: true
    }
  });
  
  // 获取日志数据
  const logStats = await prisma.systemLog.groupBy({
    by: ['level'],
    where: {
      timestamp: {
        gte: startDate
      }
    },
    _count: {
      id: true
    }
  });
  
  // 计算错误率
  const totalRequests = apiMetricsCount;
  const errorCount = await prisma.aPIMetric.count({
    where: {
      timestamp: {
        gte: startDate
      },
      statusCode: {
        gte: 400
      }
    }
  });
  
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests * 100).toFixed(2) + '%' : '0%';
  
  return {
    timeRange,
    apiRequests: {
      total: totalRequests,
      errorCount,
      errorRate,
      slowRequests,
      errorRequests
    },
    logStats: logStats.reduce((acc: Record<string, number>, curr: { level: string, _count: { id: number } }) => {
      acc[curr.level] = curr._count.id;
      return acc;
    }, {} as Record<string, number>),
    period: {
      start: startDate.toISOString(),
      end: now.toISOString()
    }
  };
} 
/**
 * API速率限制中间件
 * 用于防止API过度使用和恶意请求
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

// 用于存储IP或用户的请求计数
interface RequestTracker {
  count: number;
  resetAt: number;
  blocked: boolean;
  blockExpires?: number;
}

// 请求计数器 - IP地址/用户ID -> 请求计数
const requestCounts = new Map<string, RequestTracker>();

// 默认速率限制配置
const DEFAULT_RATE_LIMIT = 100; // 请求数量
const DEFAULT_WINDOW = 60 * 1000; // 时间窗口（毫秒）
const DEFAULT_BLOCK_DURATION = 10 * 60 * 1000; // 封禁时长（毫秒）

// 自定义限制配置 - 针对特定路径
const PATH_LIMITS: Record<string, { limit: number, window: number }> = {
  '/api/auth/login': { limit: 10, window: 60 * 1000 }, // 登录API限制
  '/api/tasks': { limit: 200, window: 60 * 1000 }, // 任务API限制
  '/api/customers': { limit: 100, window: 60 * 1000 }, // 客户API限制
  '/api/websocket': { limit: 50, window: 60 * 1000 }, // WebSocket连接限制
};

/**
 * 定期清理过期的限制记录
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, tracker] of requestCounts.entries()) {
    // 清理过期的常规限制
    if (tracker.resetAt < now && !tracker.blocked) {
      requestCounts.delete(key);
      cleanedCount++;
    } 
    // 清理已过期的封禁
    else if (tracker.blocked && tracker.blockExpires && tracker.blockExpires < now) {
      requestCounts.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.debug(`Rate limiter cleanup: removed ${cleanedCount} expired entries`);
  }
}

// 每分钟清理一次过期条目
setInterval(cleanupExpiredEntries, 60 * 1000);

/**
 * 检查请求是否应该被限制
 * @param key 用于识别请求源的键（IP地址或用户ID）
 * @param path API路径
 * @returns 是否应该限制请求
 */
function shouldRateLimit(key: string, path: string): {limited: boolean, resetIn?: number} {
  const now = Date.now();
  
  // 查找是否有这个key的记录
  let tracker = requestCounts.get(key);
  
  // 检查是否被阻止
  if (tracker?.blocked) {
    // 如果封禁已过期，重置
    if (tracker.blockExpires && tracker.blockExpires < now) {
      tracker.blocked = false;
      tracker.count = 1;
      tracker.resetAt = now + getWindowForPath(path);
      requestCounts.set(key, tracker);
      return { limited: false };
    }
    
    // 计算剩余封禁时间
    const resetIn = tracker.blockExpires ? tracker.blockExpires - now : undefined;
    return { limited: true, resetIn };
  }
  
  // 如果不存在或已过期，创建新记录
  if (!tracker || tracker.resetAt < now) {
    tracker = {
      count: 1,
      resetAt: now + getWindowForPath(path),
      blocked: false
    };
    requestCounts.set(key, tracker);
    return { limited: false };
  }
  
  // 增加计数
  tracker.count++;
  
  // 检查是否超过限制
  if (tracker.count > getLimitForPath(path)) {
    // 如果超过5倍限制，封禁一段时间
    if (tracker.count > getLimitForPath(path) * 5) {
      tracker.blocked = true;
      tracker.blockExpires = now + DEFAULT_BLOCK_DURATION;
      logger.warn(`Rate limit exceeded by 5x - blocking ${key} for ${DEFAULT_BLOCK_DURATION/1000/60} minutes`);
    }
    
    requestCounts.set(key, tracker);
    
    // 计算重置时间
    const resetIn = tracker.resetAt - now;
    return { limited: true, resetIn };
  }
  
  // 更新记录
  requestCounts.set(key, tracker);
  return { limited: false };
}

/**
 * 获取特定路径的请求限制
 */
function getLimitForPath(path: string): number {
  // 查找路径特定配置
  for (const [pattern, config] of Object.entries(PATH_LIMITS)) {
    if (path.startsWith(pattern)) {
      return config.limit;
    }
  }
  
  // 返回默认限制
  return DEFAULT_RATE_LIMIT;
}

/**
 * 获取特定路径的时间窗口
 */
function getWindowForPath(path: string): number {
  // 查找路径特定配置
  for (const [pattern, config] of Object.entries(PATH_LIMITS)) {
    if (path.startsWith(pattern)) {
      return config.window;
    }
  }
  
  // 返回默认窗口
  return DEFAULT_WINDOW;
}

/**
 * 获取请求源的标识符
 * 优先使用用户ID，如果未登录则使用IP
 */
function getRequestIdentifier(req: NextRequest): string {
  // 尝试获取token中的用户ID（如果已实现）
  const token = req.cookies.get('token')?.value;
  if (token) {
    try {
      // 注意：这里假设token中包含userId字段，实际需要根据您的token结构调整
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.userId) {
        return `user:${payload.userId}`;
      }
    } catch (e) {
      // 解析失败，使用IP
    }
  }
  
  // 获取IP地址
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * 速率限制中间件
 */
export async function rateLimiter(req: NextRequest): Promise<NextResponse | null> {
  // 不限制静态资源
  if (req.nextUrl.pathname.startsWith('/_next/') || 
      req.nextUrl.pathname.startsWith('/static/') ||
      req.nextUrl.pathname.endsWith('.ico')) {
    return null;
  }
  
  // 只限制API请求
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return null;
  }
  
  const identifier = getRequestIdentifier(req);
  const { limited, resetIn } = shouldRateLimit(identifier, req.nextUrl.pathname);
  
  if (limited) {
    // 记录速率限制事件
    logger.warn(`Rate limit exceeded for ${identifier} on ${req.nextUrl.pathname}`);
    
    // 返回速率限制响应
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too Many Requests',
        message: 'API rate limit exceeded',
        retry_after: resetIn ? Math.ceil(resetIn / 1000) : undefined
      }),
      { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          ...(resetIn ? { 'Retry-After': Math.ceil(resetIn / 1000).toString() } : {})
        } 
      }
    );
  }
  
  return null;
}

/**
 * 获取当前速率限制状态（用于监控）
 */
export function getRateLimiterStats() {
  const now = Date.now();
  const stats = {
    totalTracked: requestCounts.size,
    blockedCount: 0,
    nearLimitCount: 0,
    topRequesters: [] as {key: string, count: number, isBlocked: boolean}[]
  };
  
  // 收集统计数据
  for (const [key, tracker] of requestCounts.entries()) {
    if (tracker.blocked) {
      stats.blockedCount++;
    }
    
    // 检查是否接近限制
    const pathPrefix = key.startsWith('ip:') ? '/api/' : getPathPrefixFromKey(key);
    const limit = getLimitForPath(pathPrefix);
    if (tracker.count > limit * 0.8) {
      stats.nearLimitCount++;
    }
  }
  
  // 获取请求量最高的源
  stats.topRequesters = Array.from(requestCounts.entries())
    .map(([key, tracker]) => ({
      key,
      count: tracker.count,
      isBlocked: tracker.blocked
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return stats;
}

/**
 * 从键中提取路径前缀
 * 这是一个简化函数，实际实现可能需要根据您的用户跟踪方式调整
 */
function getPathPrefixFromKey(key: string): string {
  // 简单实现，实际可能需要更复杂的逻辑
  return '/api/';
} 
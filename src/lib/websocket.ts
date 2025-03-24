/**
 * WebSocket服务实现
 * 用于实时通知推送
 */
import { prisma } from './prisma';
import { logger } from './logger';
import { performance } from 'perf_hooks';

// 用户连接映射 - userId -> WebSocket连接
const userConnections: Map<string, Set<WebSocket>> = new Map();

// 连接计数器 - 用于监控性能
let totalConnections = 0;
let connectionStats = {
  lastMinuteConnections: 0,
  lastHourConnections: 0,
  totalMessagesProcessed: 0,
  failedMessages: 0,
  startTime: Date.now(),
};

// 每个用户最大连接数
const MAX_CONNECTIONS_PER_USER = 5;

// 非活动连接超时（毫秒）- 10分钟
const INACTIVE_TIMEOUT = 10 * 60 * 1000;

// 连接活动时间戳 - 用于清理非活动连接
const connectionActivity = new Map<WebSocket, number>();

/**
 * 将用户连接添加到连接池
 */
export function addUserConnection(userId: string, ws: WebSocket) {
  // 检查用户现有连接数
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  
  const userConns = userConnections.get(userId)!;
  
  // 如果超过最大连接数，关闭最旧的连接
  if (userConns.size >= MAX_CONNECTIONS_PER_USER) {
    const oldestConnection = findOldestConnection(userConns);
    if (oldestConnection) {
      try {
        oldestConnection.close(1000, 'Connection limit exceeded');
        userConns.delete(oldestConnection);
        connectionActivity.delete(oldestConnection);
        logger.info(`Closed oldest connection for user ${userId} due to connection limit`);
      } catch (error) {
        logger.error(`Error closing old connection for user ${userId}:`, error);
      }
    }
  }
  
  // 添加新连接
  userConns.add(ws);
  connectionActivity.set(ws, Date.now());
  totalConnections++;
  connectionStats.lastMinuteConnections++;
  connectionStats.lastHourConnections++;
  
  logger.info(`User ${userId} connected. Total connections: ${userConns.size}, System total: ${totalConnections}`);
  
  // 设置ping/pong保持连接活跃
  setupPingPong(ws, userId);
}

/**
 * 从连接池中移除用户连接
 */
export function removeUserConnection(userId: string, ws: WebSocket) {
  if (userConnections.has(userId)) {
    const connections = userConnections.get(userId)!;
    const removed = connections.delete(ws);
    
    if (removed) {
      totalConnections--;
      connectionActivity.delete(ws);
    }
    
    // 如果没有更多连接，删除整个用户条目
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
    
    logger.info(`User ${userId} disconnected. Remaining connections: ${connections.size || 0}, System total: ${totalConnections}`);
  }
}

/**
 * 向特定用户的所有连接发送消息
 */
export function sendToUser(userId: string, message: any) {
  const connections = userConnections.get(userId);
  if (!connections || connections.size === 0) {
    logger.debug(`Attempted to send message to offline user ${userId}`);
    return false; // 用户不在线
  }
  
  const startTime = performance.now();
  const messageString = JSON.stringify(message);
  let successCount = 0;
  let failCount = 0;
  
  connections.forEach(ws => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
        successCount++;
        // 更新连接活动时间戳
        connectionActivity.set(ws, Date.now());
      } else {
        failCount++;
      }
    } catch (error) {
      failCount++;
      connectionStats.failedMessages++;
      logger.error(`Error sending message to user ${userId}:`, error);
    }
  });
  
  const duration = performance.now() - startTime;
  if (duration > 100) { // 记录长时间操作
    logger.warn(`Slow message delivery to user ${userId}: ${duration.toFixed(2)}ms`);
  }
  
  connectionStats.totalMessagesProcessed += successCount;
  
  logger.debug(`Message sent to user ${userId}: ${successCount} successful, ${failCount} failed`);
  return successCount > 0;
}

/**
 * 广播消息给所有连接的用户
 */
export function broadcastMessage(message: any) {
  const startTime = performance.now();
  const messageString = JSON.stringify(message);
  let totalSent = 0;
  let totalFailed = 0;
  
  userConnections.forEach((connections, userId) => {
    connections.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageString);
          totalSent++;
          // 更新连接活动时间戳
          connectionActivity.set(ws, Date.now());
        } else {
          totalFailed++;
        }
      } catch (error) {
        totalFailed++;
        connectionStats.failedMessages++;
        logger.error(`Error broadcasting to user ${userId}:`, error);
      }
    });
  });
  
  const duration = performance.now() - startTime;
  if (duration > 200) { // 广播可能需要更长时间，设置更高阈值
    logger.warn(`Slow broadcast operation: ${duration.toFixed(2)}ms for ${totalSent} connections`);
  }
  
  connectionStats.totalMessagesProcessed += totalSent;
  
  logger.info(`Broadcast message sent to ${totalSent} connections, ${totalFailed} failed`);
  return totalSent;
}

/**
 * 获取当前所有用户连接数
 */
export function getConnectionStats() {
  const stats = {
    totalUsers: userConnections.size,
    totalConnections: totalConnections,
    userDetails: {} as Record<string, number>,
    messagingStats: {
      totalMessagesProcessed: connectionStats.totalMessagesProcessed,
      failedMessages: connectionStats.failedMessages,
      successRate: connectionStats.totalMessagesProcessed > 0 ? 
        ((connectionStats.totalMessagesProcessed - connectionStats.failedMessages) / connectionStats.totalMessagesProcessed * 100).toFixed(2) + '%' : 
        '0%'
    },
    uptime: Math.floor((Date.now() - connectionStats.startTime) / 1000 / 60) + ' minutes',
    connectionRates: {
      perMinute: connectionStats.lastMinuteConnections,
      perHour: connectionStats.lastHourConnections
    }
  };
  
  userConnections.forEach((connections, userId) => {
    stats.userDetails[userId] = connections.size;
  });
  
  return stats;
}

/**
 * 清理非活动连接
 * 此函数应该定期运行以释放资源
 */
export async function cleanupInactiveConnections() {
  const now = Date.now();
  let closedCount = 0;
  
  for (const [userId, connections] of userConnections.entries()) {
    const inactiveConnections: WebSocket[] = [];
    
    // 找出所有非活动连接
    connections.forEach(ws => {
      const lastActivity = connectionActivity.get(ws) || 0;
      if (now - lastActivity > INACTIVE_TIMEOUT) {
        inactiveConnections.push(ws);
      }
    });
    
    // 关闭非活动连接
    for (const ws of inactiveConnections) {
      try {
        ws.close(1000, 'Connection inactive');
        connections.delete(ws);
        connectionActivity.delete(ws);
        totalConnections--;
        closedCount++;
      } catch (error) {
        logger.error(`Error closing inactive connection for user ${userId}:`, error);
      }
    }
    
    // 如果用户没有更多连接，删除用户
    if (connections.size === 0) {
      userConnections.delete(userId);
    }
  }
  
  // 记录清理结果
  if (closedCount > 0) {
    logger.info(`Cleaned up ${closedCount} inactive connections`);
    
    // 将清理操作记录到数据库
    try {
      await prisma.systemLog.create({
        data: {
          level: 'INFO',
          message: `Cleaned up ${closedCount} inactive connections`,
          details: JSON.stringify({
            timestamp: new Date(),
            closedConnections: closedCount,
            remainingConnections: totalConnections,
            activeUsers: userConnections.size
          })
        }
      });
    } catch (error) {
      logger.error('Failed to log WebSocket cleanup to database:', error);
    }
  }
  
  return closedCount;
}

/**
 * 重置连接统计信息
 * 应当定期调用以获取准确的连接速率
 */
export function resetConnectionStats() {
  connectionStats.lastMinuteConnections = 0;
  connectionStats.lastHourConnections = 0;
}

/**
 * 查找最旧的连接
 */
function findOldestConnection(connections: Set<WebSocket>): WebSocket | null {
  if (connections.size === 0) return null;
  
  let oldestTime = Date.now();
  let oldestConnection: WebSocket | null = null;
  
  connections.forEach(conn => {
    const time = connectionActivity.get(conn) || Date.now();
    if (time < oldestTime) {
      oldestTime = time;
      oldestConnection = conn;
    }
  });
  
  return oldestConnection;
}

/**
 * 设置连接的ping/pong保持活跃
 */
function setupPingPong(ws: WebSocket, userId: string) {
  // 每30秒发送一次ping
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      } catch (error) {
        logger.error(`Error sending ping to user ${userId}:`, error);
        clearInterval(pingInterval);
      }
    } else {
      // 连接已关闭，清除interval
      clearInterval(pingInterval);
    }
  }, 30000);
  
  // 监听消息以更新活动时间戳
  ws.addEventListener('message', () => {
    connectionActivity.set(ws, Date.now());
  });
  
  // 当连接关闭时清除interval
  ws.addEventListener('close', () => {
    clearInterval(pingInterval);
  });
} 
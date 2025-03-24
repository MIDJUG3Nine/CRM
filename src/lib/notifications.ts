/**
 * 通知处理工具函数
 * 提供通知发送、处理和优化的通用功能
 */
import { prisma } from './prisma';
import { performance } from 'perf_hooks';
import { sendToUser } from './websocket';
import { logger } from './logger';

// 定义通知类型枚举
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_STATUS_UPDATED = 'TASK_STATUS_UPDATED',
  TASK_DUE_SOON = 'TASK_DUE_SOON',
  TASK_OVERDUE = 'TASK_OVERDUE',
  TASK_COMMENT_ADDED = 'TASK_COMMENT_ADDED',
  CUSTOMER_ADDED = 'CUSTOMER_ADDED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED'
}

// 定义用户角色枚举
export enum UserRole {
  ADMIN = 'ADMIN',
  SALES = 'SALES',
  DESIGNER = 'DESIGNER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SHAREHOLDER = 'SHAREHOLDER'
}

// 批量通知队列，用于减少数据库写入频率
interface QueuedNotification {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
}

// 通知队列
const notificationQueue: QueuedNotification[] = [];
let isProcessingQueue = false;
const FLUSH_INTERVAL = 5000; // 5秒刷新一次队列
const MAX_QUEUE_SIZE = 100; // 队列最大容量

// 定期刷新通知队列的计时器
let queueTimer: NodeJS.Timeout | null = null;

/**
 * 初始化通知系统
 */
export function initNotificationSystem() {
  // 启动队列处理计时器
  if (!queueTimer) {
    queueTimer = setInterval(processNotificationQueue, FLUSH_INTERVAL);
    logger.info('通知系统已初始化');
  }
}

/**
 * 关闭通知系统
 */
export function shutdownNotificationSystem() {
  if (queueTimer) {
    clearInterval(queueTimer);
    queueTimer = null;
    
    // 处理剩余的通知
    if (notificationQueue.length > 0) {
      processNotificationQueue();
    }
    
    logger.info('通知系统已关闭');
  }
}

/**
 * 处理通知队列
 */
async function processNotificationQueue() {
  if (isProcessingQueue || notificationQueue.length === 0) return;
  
  isProcessingQueue = true;
  const start = performance.now();
  
  try {
    // 取出队列中的通知（所有）
    const notifications = [...notificationQueue];
    notificationQueue.length = 0;
    
    // 批量创建通知
    const createdNotifications = await prisma.notification.createMany({
      data: notifications,
      skipDuplicates: true,
    });
    
    logger.info(`批量处理了 ${notifications.length} 条通知`, {
      created: createdNotifications.count,
      duration: `${(performance.now() - start).toFixed(2)}ms`,
    });
    
    // 向用户发送实时通知
    const notificationsByUser = groupNotificationsByUser(notifications);
    
    // 为每个用户发送WebSocket消息
    for (const [userId, userNotifications] of Object.entries(notificationsByUser)) {
      try {
        await sendToUser(userId, {
          type: 'NOTIFICATIONS',
          data: {
            count: userNotifications.length,
            notifications: userNotifications.map(n => ({
              type: n.type,
              title: n.title,
              relatedId: n.relatedId,
              relatedType: n.relatedType,
            })),
          },
        });
      } catch (err) {
        logger.warn(`向用户 ${userId} 发送WebSocket通知失败`, { error: (err as Error).message });
      }
    }
  } catch (error) {
    logger.error('处理通知队列失败', { error: (error as Error).message });
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * 按用户对通知进行分组
 */
function groupNotificationsByUser(notifications: QueuedNotification[]) {
  return notifications.reduce((acc, notification) => {
    if (!acc[notification.userId]) {
      acc[notification.userId] = [];
    }
    acc[notification.userId].push(notification);
    return acc;
  }, {} as Record<string, QueuedNotification[]>);
}

/**
 * 创建并发送通知
 */
export async function createNotification({
  userId,
  type,
  title,
  content,
  relatedId,
  relatedType,
  immediate = false,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
  immediate?: boolean;
}) {
  try {
    // 检查用户的通知设置，决定是否发送此类型的通知
    const userSettings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });
    
    // 根据通知类型判断是否应该发送
    if (userSettings) {
      if (
        (type === NotificationType.TASK_ASSIGNED && !userSettings.taskAssigned) ||
        (type === NotificationType.TASK_STATUS_UPDATED && !userSettings.taskStatusChanged) ||
        (type === NotificationType.TASK_DUE_SOON && !userSettings.taskDueSoon) ||
        (type === NotificationType.TASK_OVERDUE && !userSettings.taskOverdue) ||
        (type === NotificationType.TASK_COMMENT_ADDED && !userSettings.taskCommentAdded) ||
        (type === NotificationType.CUSTOMER_ADDED && !userSettings.customerAdded) ||
        (type === NotificationType.CUSTOMER_UPDATED && !userSettings.customerUpdated)
      ) {
        return null;
      }
    }
    
    if (immediate) {
      // 立即创建通知并发送WebSocket消息
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          content,
          relatedId,
          relatedType,
        },
      });
      
      // 发送WebSocket消息
      try {
        await sendToUser(userId, {
          type: 'NOTIFICATION',
          data: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            relatedId: notification.relatedId,
            relatedType: notification.relatedType,
            createdAt: notification.createdAt,
          },
        });
      } catch (err) {
        logger.warn(`向用户 ${userId} 发送实时通知失败`, { error: (err as Error).message });
      }
      
      return notification;
    } else {
      // 将通知添加到队列
      notificationQueue.push({
        userId,
        type,
        title,
        content,
        relatedId,
        relatedType,
      });
      
      // 如果队列超过最大容量，立即处理
      if (notificationQueue.length >= MAX_QUEUE_SIZE) {
        // 使用setTimeout确保不阻塞当前执行流程
        setTimeout(processNotificationQueue, 0);
      }
      
      return null;
    }
  } catch (error) {
    logger.error('创建通知失败', {
      userId,
      type,
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * 为任务更新创建相应的通知
 */
export async function createTaskNotification({
  taskId,
  title,
  content,
  type,
  assigneeId,
}: {
  taskId: string;
  title: string;
  content: string;
  type: NotificationType;
  assigneeId?: string;
}) {
  try {
    // 获取任务详情，包括相关用户
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        creator: true,
      },
    });
    
    if (!task) {
      logger.warn(`任务通知创建失败: 任务 ${taskId} 不存在`);
      return;
    }
    
    // 确定通知接收者
    const recipients = new Set<string>();
    
    // 任务负责人接收通知（如果不是通知发起人）
    if (task.assigneeId && task.assigneeId !== assigneeId) {
      recipients.add(task.assigneeId);
    }
    
    // 任务创建者接收通知（如果不是通知发起人且不是任务负责人）
    if (task.creatorId !== assigneeId && task.creatorId !== task.assigneeId) {
      recipients.add(task.creatorId);
    }
    
    // 找到所有项目经理，他们也应接收任务通知
    if (type === NotificationType.TASK_STATUS_UPDATED || type === NotificationType.TASK_OVERDUE) {
      const projectManagers = await prisma.user.findMany({
        where: { role: UserRole.PROJECT_MANAGER },
        select: { id: true },
      });
      
      for (const pm of projectManagers) {
        if (pm.id !== assigneeId) {
          recipients.add(pm.id);
        }
      }
    }
    
    // 为每个接收者创建通知
    const notifications = [];
    for (const userId of recipients) {
      notifications.push(
        createNotification({
          userId,
          type,
          title,
          content,
          relatedId: taskId,
          relatedType: 'task',
        })
      );
    }
    
    // 并行处理所有通知创建
    await Promise.all(notifications);
    
  } catch (error) {
    logger.error('创建任务通知失败', {
      taskId,
      type,
      error: (error as Error).message,
    });
  }
}

/**
 * 将通知标记为已读
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    
    return true;
  } catch (error) {
    logger.error('将通知标记为已读失败', {
      notificationId,
      error: (error as Error).message,
    });
    
    return false;
  }
}

/**
 * 将用户的所有通知标记为已读
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId, 
        isRead: false 
      },
      data: { isRead: true },
    });
    
    return true;
  } catch (error) {
    logger.error('将所有通知标记为已读失败', {
      userId,
      error: (error as Error).message,
    });
    
    return false;
  }
}

/**
 * 获取用户的未读通知数量
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    
    return count;
  } catch (error) {
    logger.error('获取未读通知数量失败', {
      userId,
      error: (error as Error).message,
    });
    
    return 0;
  }
}

// 确保通知系统在应用启动时初始化
initNotificationSystem(); 
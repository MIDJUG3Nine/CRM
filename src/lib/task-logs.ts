import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// 从schema.prisma定义任务状态类型
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';

// 从schema.prisma定义任务优先级类型
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// 定义任务日志类型
type TaskLog = {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export interface LogTaskChangeParams {
  taskId: string;
  userId: string;
  changeType: 'CREATED' | 'UPDATED' | 'COMMENT_ADDED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'PRIORITY_CHANGED';
  oldValue?: string;
  newValue?: string;
  comment?: string;
}

/**
 * 记录任务变更
 * @param params 任务变更参数
 * @returns 创建的任务日志
 */
export async function logTaskChange(params: LogTaskChangeParams): Promise<TaskLog> {
  try {
    const { taskId, userId, changeType, oldValue, newValue, comment } = params;
    
    const taskLog = await prisma.taskLog.create({
      data: {
        taskId,
        userId,
        action: changeType,
        oldValue: oldValue || null,
        newValue: newValue || null,
        comment: comment || null,
        createdAt: new Date(),
      },
    });
    
    return taskLog;
  } catch (error) {
    console.error('Failed to log task change:', error);
    throw new Error('Failed to log task change');
  }
}

/**
 * 获取任务的变更历史
 * @param taskId 任务ID
 * @returns 任务日志列表
 */
export async function getTaskLogs(taskId: string): Promise<TaskLog[]> {
  try {
    const logs = await prisma.taskLog.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    
    return logs;
  } catch (error) {
    console.error('Failed to get task logs:', error);
    throw new Error('Failed to get task logs');
  }
}

/**
 * 格式化任务日志为可读文本
 * @param log 任务日志
 * @returns 格式化后的日志文本
 */
export function formatTaskLog(log: TaskLog & { user: { name: string, email: string } }): string {
  const { action: changeType, oldValue, newValue, user, createdAt } = log;
  const date = new Date(createdAt).toLocaleString();
  
  switch (changeType) {
    case 'CREATED':
      return `${user.name} created the task on ${date}`;
    
    case 'UPDATED':
      return `${user.name} updated the task on ${date}`;
    
    case 'COMMENT_ADDED':
      return `${user.name} commented: "${newValue}" on ${date}`;
    
    case 'STATUS_CHANGED':
      return `${user.name} changed status from ${formatStatus(oldValue as TaskStatus)} to ${formatStatus(newValue as TaskStatus)} on ${date}`;
    
    case 'ASSIGNED':
      if (!oldValue) {
        return `${user.name} assigned the task to ${newValue} on ${date}`;
      } else if (!newValue) {
        return `${user.name} unassigned the task from ${oldValue} on ${date}`;
      } else {
        return `${user.name} reassigned the task from ${oldValue} to ${newValue} on ${date}`;
      }
    
    case 'PRIORITY_CHANGED':
      return `${user.name} changed priority from ${formatPriority(oldValue as TaskPriority)} to ${formatPriority(newValue as TaskPriority)} on ${date}`;
    
    default:
      return `${user.name} performed an action on ${date}`;
  }
}

/**
 * 格式化任务状态为可读文本
 * @param status 任务状态
 * @returns 格式化后的状态文本
 */
function formatStatus(status: TaskStatus | null | undefined): string {
  if (!status) return 'None';
  
  const statusMap: Record<TaskStatus, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    DELAYED: 'Delayed',
    CANCELLED: 'Cancelled',
  };
  
  return statusMap[status] || status;
}

/**
 * 格式化任务优先级为可读文本
 * @param priority 任务优先级
 * @returns 格式化后的优先级文本
 */
function formatPriority(priority: TaskPriority | null | undefined): string {
  if (!priority) return 'None';
  
  const priorityMap: Record<TaskPriority, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent',
  };
  
  return priorityMap[priority] || priority;
} 
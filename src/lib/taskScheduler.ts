import { prisma } from './prisma';
import { createNotification, NotificationType } from './notifications';

/**
 * 检查即将到期任务并发送通知
 * 此函数应通过cron任务每天运行
 */
export async function checkDueTasks() {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 查找24小时内到期的任务
    const tasks = await prisma.task.findMany({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        },
        dueDate: {
          gte: now,
          lte: tomorrow
        },
        // 只查找尚未发送过到期提醒的任务
        NOT: {
          logs: {
            some: {
              action: 'DUE_SOON_NOTIFIED',
              createdAt: {
                gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 过去24小时内
              }
            }
          }
        }
      },
      include: {
        assignee: true
      }
    });
    
    console.log(`Found ${tasks.length} tasks due within 24 hours`);
    
    // 为每个即将到期的任务发送通知
    for (const task of tasks) {
      if (task.assigneeId) {
        // 创建通知
        await createNotification({
          userId: task.assigneeId,
          type: NotificationType.TASK_DUE_SOON,
          title: '任务即将到期',
          content: `任务 "${task.title}" 将在24小时内到期`,
          relatedId: task.id,
          relatedType: 'TASK'
        });
        
        // 记录已通知日志
        await prisma.taskLog.create({
          data: {
            taskId: task.id,
            userId: task.assigneeId,
            action: 'DUE_SOON_NOTIFIED',
            oldValue: null,
            newValue: JSON.stringify({
              dueDate: task.dueDate,
              notifiedAt: new Date()
            })
          }
        });
        
        console.log(`Notification sent for task ${task.id} to user ${task.assigneeId}`);
      }
    }
    
    // 查找已经过期但未通知的任务
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        },
        dueDate: {
          lt: now
        },
        // 只查找尚未发送过过期提醒的任务
        NOT: {
          logs: {
            some: {
              action: 'OVERDUE_NOTIFIED',
              createdAt: {
                gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 过去24小时内
              }
            }
          }
        }
      },
      include: {
        assignee: true,
        creator: true
      }
    });
    
    console.log(`Found ${overdueTasks.length} overdue tasks`);
    
    // 为每个过期任务发送通知
    for (const task of overdueTasks) {
      // 通知任务执行者
      if (task.assigneeId) {
        await createNotification({
          userId: task.assigneeId,
          type: NotificationType.TASK_OVERDUE,
          title: '任务已过期',
          content: `任务 "${task.title}" 已过期未完成`,
          relatedId: task.id,
          relatedType: 'TASK'
        });
      }
      
      // 通知任务创建者（如果不是同一人）
      if (task.creatorId && task.creatorId !== task.assigneeId) {
        await createNotification({
          userId: task.creatorId,
          type: NotificationType.TASK_OVERDUE,
          title: '您创建的任务已过期',
          content: `您创建的任务 "${task.title}" 已过期未完成`,
          relatedId: task.id,
          relatedType: 'TASK'
        });
      }
      
      // 记录已通知日志
      await prisma.taskLog.create({
        data: {
          taskId: task.id,
          userId: task.assigneeId || task.creatorId,
          action: 'OVERDUE_NOTIFIED',
          oldValue: null,
          newValue: JSON.stringify({
            dueDate: task.dueDate,
            notifiedAt: new Date()
          })
        }
      });
      
      console.log(`Overdue notification sent for task ${task.id}`);
    }
    
    return {
      dueSoonTasks: tasks.length,
      overdueTasks: overdueTasks.length
    };
  } catch (error) {
    console.error('Error in checkDueTasks:', error);
    throw error;
  }
}

/**
 * 手动运行任务检查（用于开发和测试）
 */
export async function runTaskCheck(req: Request): Promise<Response> {
  try {
    const result = await checkDueTasks();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to run task check:', error);
    return new Response(JSON.stringify({ error: 'Failed to run task check' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  createApiHandler, 
  createPaginationResponse, 
  createSuccessResponse, 
  parsePagination, 
  parseQueryParams, 
  validateData,
  ApiError
} from '@/lib/api';
import { createNotification, NotificationType } from '@/lib/notifications';

// 任务创建验证模式
const taskCreateSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.union([
    z.string().transform(val => val ? new Date(val) : null),
    z.date().nullable(),
    z.null()
  ]),
  assigneeId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
});

// 任务更新验证模式
const taskUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.union([
    z.string().transform(val => val ? new Date(val) : null),
    z.date().nullable(),
    z.null()
  ]).optional(),
  assigneeId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
});

/**
 * 获取任务列表
 */
export const GET = createApiHandler({
  handler: async (req, { user }) => {
    const { page, pageSize, skip } = parsePagination(req);
    const params = parseQueryParams(req);

    // 构建过滤条件
    const where: any = {};

    // 根据角色限制任务可见性
    if (user.role === 'SALES' || user.role === 'DESIGNER') {
      where.OR = [
        { assigneeId: user.id },
        { creatorId: user.id }
      ];
    }

    // 应用查询过滤器
    if (params.status) {
      where.status = params.status;
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: params.search } },
        { description: { contains: params.search } }
      ];
    }

    if (params.assigneeId) {
      where.assigneeId = params.assigneeId;
    }

    if (params.customerId) {
      where.customerId = params.customerId;
    }

    // 构建排序条件
    const orderBy: any = {};
    if (params.sortBy) {
      const direction = params.sortDirection === 'desc' ? 'desc' : 'asc';
      orderBy[params.sortBy] = direction;
    } else {
      orderBy.createdAt = 'desc';
    }

    // 获取任务列表和总数
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      }),
      prisma.task.count({ where })
    ]);

    // 返回分页结果
    return createSuccessResponse(
      createPaginationResponse(tasks, total, { page, pageSize })
    );
  }
});

/**
 * 创建新任务
 */
export const POST = createApiHandler({
  handler: async (req, { user }) => {
    // 解析请求体
    const body = await req.json();
    
    // 验证数据
    const data = validateData(taskCreateSchema, body);
    
    // 创建任务
    const task = await prisma.task.create({
      data: {
        ...data,
        creatorId: user.id
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // 记录任务创建日志
    await prisma.taskLog.create({
      data: {
        taskId: task.id,
        userId: user.id,
        action: 'created',
        newValue: JSON.stringify({
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate
        })
      }
    });

    // 如果分配了用户，创建通知
    if (task.assigneeId && task.assigneeId !== user.id) {
      await createNotification({
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New task assigned to you',
        content: `${user.name} 已将任务 "${task.title}" 分配给您`,
        relatedId: task.id,
        relatedType: 'task'
      });
    }

    return createSuccessResponse(task);
  }
});

/**
 * 获取单个任务详情
 * 处理GET /api/tasks/[id]请求
 */
export async function getTaskById(req: NextRequest, taskId: string) {
  return createApiHandler({
    handler: async (req, { user }) => {
      // 检查taskId是否有效
      if (!taskId || typeof taskId !== 'string') {
        throw new ApiError('Invalid task ID', { statusCode: 400 });
      }

      // 获取任务详情
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          customer: true,
          creator: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          logs: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!task) {
        throw new ApiError('Task not found', { statusCode: 404 });
      }

      // 检查访问权限
      if (
        user.role !== 'ADMIN' &&
        user.role !== 'PROJECT_MANAGER' &&
        user.id !== task.assigneeId &&
        user.id !== task.creatorId
      ) {
        throw new ApiError('You do not have permission to view this task', { statusCode: 403 });
      }

      return createSuccessResponse(task);
    }
  })(req);
}

/**
 * 更新任务
 * 处理PATCH /api/tasks/[id]请求
 */
export async function updateTask(req: NextRequest, taskId: string) {
  return createApiHandler({
    handler: async (req, { user }) => {
      // 检查taskId是否有效
      if (!taskId || typeof taskId !== 'string') {
        throw new ApiError('Invalid task ID', { statusCode: 400 });
      }

      // 获取现有任务
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!existingTask) {
        throw new ApiError('Task not found', { statusCode: 404 });
      }

      // 检查权限
      if (
        user.role !== 'ADMIN' &&
        user.role !== 'PROJECT_MANAGER' &&
        user.id !== existingTask.assigneeId &&
        user.id !== existingTask.creatorId
      ) {
        throw new ApiError('You do not have permission to update this task', { statusCode: 403 });
      }

      // 解析并验证更新数据
      const body = await req.json();
      const updates = validateData(taskUpdateSchema, body);

      // 记录变更
      const changes: Record<string, { from: any; to: any }> = {};
      Object.entries(updates).forEach(([key, value]) => {
        const oldValue = existingTask[key as keyof typeof existingTask];
        if (value !== oldValue) {
          changes[key] = { from: oldValue, to: value };
        }
      });

      // 如果有变更，创建日志
      if (Object.keys(changes).length > 0) {
        await prisma.taskLog.create({
          data: {
            taskId,
            userId: user.id,
            action: 'updated',
            oldValue: JSON.stringify(
              Object.fromEntries(
                Object.entries(changes).map(([key, { from }]) => [key, from])
              )
            ),
            newValue: JSON.stringify(
              Object.fromEntries(
                Object.entries(changes).map(([key, { to }]) => [key, to])
              )
            )
          }
        });

        // 如果状态发生了变化，发送通知
        if (changes.status) {
          if (existingTask.assigneeId && existingTask.assigneeId !== user.id) {
            await createNotification({
              userId: existingTask.assigneeId,
              type: NotificationType.TASK_STATUS_UPDATED,
              title: 'Task status changed',
              content: `${user.name} 已将任务 "${existingTask.title}" 的状态从 ${changes.status.from} 更新为 ${changes.status.to}`,
              relatedId: taskId,
              relatedType: 'task'
            });
          }

          if (existingTask.creatorId !== user.id && existingTask.creatorId !== existingTask.assigneeId) {
            await createNotification({
              userId: existingTask.creatorId,
              type: NotificationType.TASK_STATUS_UPDATED,
              title: 'Task status changed',
              content: `${user.name} 已将任务 "${existingTask.title}" 的状态从 ${changes.status.from} 更新为 ${changes.status.to}`,
              relatedId: taskId,
              relatedType: 'task'
            });
          }
        }

        // 如果分配者发生了变化，给新的分配者发送通知
        if (
          changes.assigneeId && 
          changes.assigneeId.to && 
          changes.assigneeId.to !== user.id
        ) {
          await createNotification({
            userId: changes.assigneeId.to,
            type: NotificationType.TASK_ASSIGNED,
            title: 'Task assigned to you',
            content: `${user.name} 已将任务 "${existingTask.title}" 分配给您`,
            relatedId: taskId,
            relatedType: 'task'
          });
        }
      }

      // 更新任务
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updates,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          customer: true,
          creator: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });

      return createSuccessResponse(updatedTask);
    }
  })(req);
}

/**
 * 删除任务
 * 处理DELETE /api/tasks/[id]请求
 */
export async function deleteTask(req: NextRequest, taskId: string) {
  return createApiHandler({
    handler: async (req, { user }) => {
      // 检查taskId是否有效
      if (!taskId || typeof taskId !== 'string') {
        throw new ApiError('Invalid task ID', { statusCode: 400 });
      }

      // 获取现有任务
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId }
      });

      if (!existingTask) {
        throw new ApiError('Task not found', { statusCode: 404 });
      }

      // 检查权限
      if (user.role !== 'ADMIN' && user.role !== 'PROJECT_MANAGER' && user.id !== existingTask.creatorId) {
        throw new ApiError('You do not have permission to delete this task', { statusCode: 403 });
      }

      // 删除任务
      await prisma.task.delete({
        where: { id: taskId }
      });

      return createSuccessResponse({ success: true, message: 'Task deleted successfully' });
    }
  })(req);
} 
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { logTaskChange } from '@/lib/task-logs';
import { createNotification, NotificationType } from '@/lib/notifications';
import { sendToUser } from '@/lib/websocket';

// 任务更新验证
const taskUpdateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
});

// 获取任务详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            industry: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 是否包含任务日志
    const includeLogs = request.nextUrl.searchParams.get('logs') === 'true';
    let logs: Array<any> = [];
    
    if (includeLogs) {
      // 获取任务日志
      logs = await prisma.taskLog.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
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
    }

    // 返回任务详情和日志
    return NextResponse.json({
      data: {
        ...task,
        logs: includeLogs ? logs : undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// 更新任务
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();

    // 验证数据
    const validation = taskUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    // 查找任务
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 检查权限
    const canEdit = 
      user.role === 'ADMIN' || 
      user.role === 'PROJECT_MANAGER' || 
      existingTask.creatorId === user.userId || 
      existingTask.assigneeId === user.userId;

    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to update this task' }, { status: 403 });
    }

    const updateData = validation.data;
    
    // 记录任务变更
    const changesArray = [];
    
    // 检查状态变化
    if (updateData.status && updateData.status !== existingTask.status) {
      changesArray.push(
        logTaskChange({
          taskId,
          userId: user.userId,
          changeType: 'STATUS_CHANGED',
          oldValue: existingTask.status,
          newValue: updateData.status,
        })
      );
      
      // 添加状态变更通知
      if (existingTask.creatorId !== user.userId) {
        changesArray.push(
          createNotification({
            userId: existingTask.creatorId,
            type: NotificationType.TASK_STATUS_UPDATED,
            title: 'Task status updated',
            content: `Task "${existingTask.title}" status changed to ${updateData.status}`,
            relatedId: taskId,
            relatedType: 'task',
          }).then(notification => {
            // 通过WebSocket发送实时通知
            sendToUser(existingTask.creatorId, {
              type: 'notification',
              data: notification,
            });
          })
        );
      }
    }
    
    // 检查优先级变化
    if (updateData.priority && updateData.priority !== existingTask.priority) {
      changesArray.push(
        logTaskChange({
          taskId,
          userId: user.userId,
          changeType: 'PRIORITY_CHANGED',
          oldValue: existingTask.priority,
          newValue: updateData.priority,
        })
      );
    }
    
    // 检查分配对象变化
    if (updateData.assigneeId !== undefined && updateData.assigneeId !== existingTask.assigneeId) {
      // 获取旧的和新的分配对象信息
      let oldAssigneeName = 'None';
      let newAssigneeName = 'None';
      
      if (existingTask.assigneeId) {
        const oldAssignee = await prisma.user.findUnique({
          where: { id: existingTask.assigneeId },
          select: { name: true },
        });
        if (oldAssignee) {
          oldAssigneeName = oldAssignee.name;
        }
      }
      
      if (updateData.assigneeId) {
        const newAssignee = await prisma.user.findUnique({
          where: { id: updateData.assigneeId },
          select: { name: true, id: true },
        });
        if (newAssignee) {
          newAssigneeName = newAssignee.name;
          
          // 向新分配的用户发送通知
          changesArray.push(
            createNotification({
              userId: newAssignee.id,
              type: NotificationType.TASK_ASSIGNED,
              title: 'Task assigned to you',
              content: `You have been assigned to task "${existingTask.title}"`,
              relatedId: taskId,
              relatedType: 'task',
            }).then(notification => {
              // 通过WebSocket发送实时通知
              sendToUser(newAssignee.id, {
                type: 'notification',
                data: notification,
              });
            })
          );
        }
      }
      
      // 记录分配变更
      changesArray.push(
        logTaskChange({
          taskId,
          userId: user.userId,
          changeType: 'ASSIGNED',
          oldValue: oldAssigneeName,
          newValue: newAssigneeName,
        })
      );
    }
    
    // 检查其他字段变更
    if (
      updateData.title || 
      updateData.description || 
      updateData.dueDate || 
      updateData.customerId
    ) {
      changesArray.push(
        logTaskChange({
          taskId,
          userId: user.userId,
          changeType: 'UPDATED',
          comment: JSON.stringify({
            title: updateData.title,
            description: updateData.description,
            dueDate: updateData.dueDate,
            customerId: updateData.customerId,
          }),
        })
      );
    }
    
    // 更新任务
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            industry: true,
          },
        },
      },
    });
    
    // 等待所有变更记录完成
    await Promise.all(changesArray);
    
    // 返回更新后的任务
    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;
  
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 查找任务
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 检查删除权限 - 仅限任务创建者、项目经理和管理员
    const canDelete = 
      user.role === 'ADMIN' || 
      user.role === 'PROJECT_MANAGER' || 
      task.creatorId === user.userId;

    if (!canDelete) {
      return NextResponse.json({ error: 'You do not have permission to delete this task' }, { status: 403 });
    }

    // 删除任务
    await prisma.task.delete({
      where: { id: taskId },
    });

    // 返回成功响应
    return NextResponse.json({
      data: { message: 'Task deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
} 
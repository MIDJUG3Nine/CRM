import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { logTaskChange } from '@/lib/task-logs';
import { createNotification, NotificationType } from '@/lib/notifications';
import { sendToUser } from '@/lib/websocket';

// 验证评论数据
const commentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment must be less than 1000 characters'),
});

// 获取任务的评论列表
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

    // 检查任务是否存在
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
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 获取分页参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // 获取评论总数
    const totalComments = await prisma.taskComment.count({
      where: { taskId },
    });

    // 获取评论列表
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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

    // 返回评论列表和分页信息
    return NextResponse.json({
      data: comments,
      pagination: {
        page,
        limit,
        totalItems: totalComments,
        totalPages: Math.ceil(totalComments / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching task comments:', error);
    return NextResponse.json({ error: 'Failed to fetch task comments' }, { status: 500 });
  }
}

// 添加新评论
export async function POST(
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

    // 验证评论数据
    const validation = commentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { content } = validation.data;

    // 检查任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        creator: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 创建评论
    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        userId: user.userId,
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

    // 记录任务日志
    await logTaskChange({
      taskId,
      userId: user.userId,
      changeType: 'COMMENT_ADDED',
      newValue: content,
    });

    // 向任务创建者发送通知（如果不是当前用户）
    if (task.creatorId !== user.userId) {
      const notification = await createNotification({
        userId: task.creatorId,
        type: NotificationType.TASK_COMMENT_ADDED,
        title: 'New comment on your task',
        content: `${user.name} commented on task: ${task.title}`,
        relatedId: taskId,
        relatedType: 'task',
      });
      
      // 通过WebSocket发送实时通知
      sendToUser(task.creatorId, {
        type: 'notification',
        data: notification,
      });
    }

    // 向任务负责人发送通知（如果存在且不是当前用户）
    if (task.assigneeId && task.assigneeId !== user.userId && task.assigneeId !== task.creatorId) {
      const notification = await createNotification({
        userId: task.assigneeId,
        type: NotificationType.TASK_COMMENT_ADDED,
        title: 'New comment on your assigned task',
        content: `${user.name} commented on task: ${task.title}`,
        relatedId: taskId,
        relatedType: 'task',
      });
      
      // 通过WebSocket发送实时通知
      sendToUser(task.assigneeId, {
        type: 'notification',
        data: notification,
      });
    }

    // 返回创建的评论
    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error('Error adding task comment:', error);
    return NextResponse.json({ error: 'Failed to add task comment' }, { status: 500 });
  }
} 
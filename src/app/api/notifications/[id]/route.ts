import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { markNotificationAsRead } from '@/lib/notifications';

// 获取单个通知详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const notificationId = params.id;
  
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 获取通知详情
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // 检查通知是否属于当前用户
    if (notification.userId !== user.userId) {
      return NextResponse.json({ error: 'You do not have permission to view this notification' }, { status: 403 });
    }

    // 返回通知详情
    return NextResponse.json({ data: notification });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 });
  }
}

// 标记单个通知为已读
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const notificationId = params.id;
  
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 获取通知详情
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // 检查通知是否属于当前用户
    if (notification.userId !== user.userId) {
      return NextResponse.json({ error: 'You do not have permission to modify this notification' }, { status: 403 });
    }

    // 标记通知为已读
    const updatedNotification = await markNotificationAsRead(notificationId);

    // 返回更新后的通知
    return NextResponse.json({ data: updatedNotification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}

// 删除通知
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const notificationId = params.id;
  
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 获取通知详情
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // 检查通知是否属于当前用户
    if (notification.userId !== user.userId) {
      return NextResponse.json({ error: 'You do not have permission to delete this notification' }, { status: 403 });
    }

    // 删除通知
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    // 返回成功响应
    return NextResponse.json({
      data: { message: 'Notification deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
} 
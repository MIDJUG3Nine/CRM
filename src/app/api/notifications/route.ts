import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUnreadNotificationCount, markAllNotificationsAsRead } from '@/lib/notifications';

// 获取用户的通知列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 解析请求参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const unreadOnly = url.searchParams.get('unread') === 'true';

    // 构建通知查询条件
    const where = {
      userId: user.userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    // 获取通知总数
    const totalNotifications = await prisma.notification.count({ where });

    // 获取通知列表
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // 获取未读通知数量
    const unreadCount = await getUnreadNotificationCount(user.userId);

    // 返回通知列表和分页信息
    return NextResponse.json({
      data: notifications,
      pagination: {
        page,
        limit,
        totalItems: totalNotifications,
        totalPages: Math.ceil(totalNotifications / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// 标记所有通知为已读
export async function PATCH(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 标记所有通知为已读
    await markAllNotificationsAsRead(user.userId);

    // 返回成功响应
    return NextResponse.json({
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
} 
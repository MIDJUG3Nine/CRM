import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { markAllNotificationsAsRead } from '@/lib/notifications';

// 标记所有通知为已读
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // 标记该用户的所有通知为已读
    const { count } = await markAllNotificationsAsRead(user.userId);

    return NextResponse.json({
      message: `${count} notifications marked as read`,
      count,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api';

// 通知设置验证模式
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  taskAssigned: z.boolean(),
  taskStatusChanged: z.boolean(),
  taskDueSoon: z.boolean(),
  taskOverdue: z.boolean(),
  taskCommentAdded: z.boolean(),
  customerAdded: z.boolean(),
  customerUpdated: z.boolean(),
  dailySummary: z.boolean(),
  weeklySummary: z.boolean(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

// 获取用户的通知设置
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取用户的通知设置
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId: user.userId },
    });

    // 如果没有找到设置记录，返回默认设置
    if (!settings) {
      const defaultSettings: NotificationSettings = {
        emailNotifications: true,
        pushNotifications: true,
        taskAssigned: true,
        taskStatusChanged: true,
        taskDueSoon: true,
        taskOverdue: true,
        taskCommentAdded: true,
        customerAdded: true,
        customerUpdated: true,
        dailySummary: false,
        weeklySummary: true,
      };
      
      return NextResponse.json({ success: true, data: defaultSettings });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return handleApiError(error);
  }
}

// 更新用户的通知设置
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await req.json();
    
    // 验证请求数据
    const validatedData = notificationSettingsSchema.parse(body);

    // 更新或创建用户的通知设置
    const settings = await prisma.notificationSettings.upsert({
      where: { userId: user.userId },
      update: validatedData,
      create: {
        userId: user.userId,
        ...validatedData,
      },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return handleApiError(error);
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { checkDueTasks } from '@/lib/taskScheduler';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * 手动触发任务到期检查
 * 此端点通常应通过定时任务自动触发，也可由管理员手动触发
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户权限 - 只有管理员可手动触发
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can trigger this action.' },
        { status: 403 }
      );
    }

    // 执行任务检查
    const result = await checkDueTasks();
    
    return NextResponse.json({
      message: 'Task check completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Error running task check:', error);
    return NextResponse.json(
      { error: 'Failed to run task check' },
      { status: 500 }
    );
  }
} 
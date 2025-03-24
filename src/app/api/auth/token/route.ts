import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // 从请求中获取认证的用户
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 成功获取到用户认证信息
    return NextResponse.json({ 
      success: true,
      userId: authUser.userId,
      role: authUser.role 
    });
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 401 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// 用于追踪请求的简单内存存储
const ipRequestMap = new Map<string, { count: number, lastReset: number }>();
const MAX_REQUESTS = 5; // 每个时间窗口内最大请求数
const TIME_WINDOW = 60 * 1000; // 时间窗口为60秒

export async function POST(req: NextRequest) {
  try {
    // 获取客户端IP地址
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // 检查请求限制
    const now = Date.now();
    const requestData = ipRequestMap.get(ip) || { count: 0, lastReset: now };
    
    // 如果上次重置时间已经超过时间窗口，重置计数
    if (now - requestData.lastReset > TIME_WINDOW) {
      requestData.count = 0;
      requestData.lastReset = now;
    }
    
    // 检查是否超过请求限制
    if (requestData.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }
    
    // 增加请求计数
    requestData.count++;
    ipRequestMap.set(ip, requestData);
    
    // 获取请求正文
    const body = await req.json();
    const { email, password } = body;
    
    // 验证所需字段
    if (!email || !password) {
      return NextResponse.json(
        { error: '请提供电子邮件和密码' },
        { status: 400 }
      );
    }
    
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    // 检查用户是否存在并已批准
    if (!user || !user.isApproved) {
      return NextResponse.json(
        { error: '无效的凭据或用户未获批准' },
        { status: 401 }
      );
    }
    
    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: '无效的凭据' }, { status: 401 });
    }
    
    // 创建令牌
    const token = await createToken({
      userId: user.id,
      role: user.role,
      name: user.name
    });
    
    console.log(`[Login] 生成的token: ${token.substring(0, 10)}...`);
    
    // 设置cookie并返回用户数据
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: token, // 直接返回token给前端也有助于调试
    });
    
    // 设置HTTP-only cookie以防止XSS攻击
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // 改为lax以允许跨站点请求
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });
    
    // 为了兼容性，同时设置token cookie (不使用httpOnly，使前端JavaScript可访问)
    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });
    
    console.log(`[Login] Cookie已设置: auth_token和token`);
    
    return response;
  } catch (error) {
    console.error('登录处理错误:', error);
    return NextResponse.json(
      { error: '登录处理失败' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // 解析请求数据
    const data = await request.json();
    const { title, type, description, priority, email } = data;
    
    // 验证必填字段
    if (!title || !type || !description || !priority) {
      return NextResponse.json(
        { message: '请填写所有必填字段' }, 
        { status: 400 }
      );
    }
    
    // 记录反馈到数据库
    const feedback = await prisma.feedback.create({
      data: {
        title,
        type,
        description,
        priority,
        contactEmail: email || null,
        userId: null, // 简化版本不依赖于用户认证
        status: 'PENDING',
      },
    });
    
    // 记录日志
    logger.info('用户反馈已提交', {
      feedbackId: feedback.id,
      type,
      priority
    });
    
    // 返回成功响应
    return NextResponse.json(
      { 
        message: '反馈已成功提交',
        feedbackId: feedback.id
      }, 
      { status: 201 }
    );
  } catch (error: any) {
    // 记录错误日志
    logger.error('提交反馈失败', {
      error: error.message,
      stack: error.stack
    });
    
    // 返回错误响应
    return NextResponse.json(
      { message: '提交反馈失败，请稍后重试' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 验证请求体
const profileUpdateSchema = z.object({
  name: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
})
.refine(
  data => !(data.newPassword && !data.currentPassword), 
  { message: "当前密码必须提供以便验证修改密码请求" }
);

export async function PATCH(request: Request) {
  try {
    // 检查用户是否已登录
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权操作' },
        { status: 401 }
      );
    }
    
    // 解析请求体
    const body = await request.json();
    
    // 验证请求体
    const validationResult = profileUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { name, currentPassword, newPassword } = validationResult.data;
    
    // 获取当前用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
        password: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 准备更新数据
    const updateData: any = {};
    
    // 如果提供了新名称，则更新
    if (name !== undefined) {
      updateData.name = name;
    }
    
    // 处理密码更新
    if (newPassword) {
      // 验证当前密码
      const isPasswordValid = await bcrypt.compare(currentPassword || '', user.password);
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: '当前密码无效' },
          { status: 400 }
        );
      }
      
      // 如果密码有效，则哈希新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }
    
    // 如果没有要更新的内容，则返回
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '没有提供需要更新的字段' },
        { status: 400 }
      );
    }
    
    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    // 返回更新后的用户信息（不包含密码）
    return NextResponse.json({
      user: updatedUser,
      message: '个人资料已更新',
    });
  } catch (error) {
    console.error('更新个人资料时出错:', error);
    return NextResponse.json(
      { error: '更新个人资料失败' },
      { status: 500 }
    );
  }
} 
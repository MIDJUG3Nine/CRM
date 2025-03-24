import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// 联系记录更新验证模式
const contactUpdateSchema = z.object({
  method: z.enum(['EMAIL', 'PHONE', 'MEETING', 'VIDEO_CALL', 'OTHER']).optional(),
  content: z.string().min(1, 'Content is required').optional(),
  feedback: z.string().nullish().optional(),
  followUpPlan: z.string().nullish().optional(),
});

// 获取单个联系记录
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const contactId = params.id;
    
    // 查询联系记录
    const contactRecord = await prisma.contactRecord.findUnique({
      where: { id: contactId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            salespersonId: true,
          },
        },
      },
    });

    // 如果联系记录不存在
    if (!contactRecord) {
      return NextResponse.json({ message: 'Contact record not found' }, { status: 404 });
    }

    // 验证访问权限
    const canAccess =
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      contactRecord.userId === user.userId ||
      contactRecord.customer.salespersonId === user.userId;

    if (!canAccess) {
      return NextResponse.json(
        { message: 'You do not have permission to access this contact record' },
        { status: 403 }
      );
    }

    return NextResponse.json(contactRecord);
  } catch (error: unknown) {
    console.error('Error fetching contact record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contact record';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// 更新联系记录
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const contactId = params.id;
    
    // 查询联系记录
    const existingRecord = await prisma.contactRecord.findUnique({
      where: { id: contactId },
      include: {
        customer: {
          select: {
            salespersonId: true,
          },
        },
      },
    });

    // 如果联系记录不存在
    if (!existingRecord) {
      return NextResponse.json({ message: 'Contact record not found' }, { status: 404 });
    }

    // 验证更新权限
    const canUpdate =
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      existingRecord.userId === user.userId;

    if (!canUpdate) {
      return NextResponse.json(
        { message: 'You do not have permission to update this contact record' },
        { status: 403 }
      );
    }

    // 解析和验证请求数据
    const data = await request.json();
    const validated = contactUpdateSchema.parse(data);
    
    // 更新联系记录
    const updatedRecord = await prisma.contactRecord.update({
      where: { id: contactId },
      data: validated,
    });
    
    return NextResponse.json(updatedRecord);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating contact record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update contact record';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// 删除联系记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const contactId = params.id;
    
    // 查询联系记录
    const existingRecord = await prisma.contactRecord.findUnique({
      where: { id: contactId },
    });

    // 如果联系记录不存在
    if (!existingRecord) {
      return NextResponse.json({ message: 'Contact record not found' }, { status: 404 });
    }

    // 验证删除权限
    const canDelete =
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      (existingRecord.userId === user.userId);

    if (!canDelete) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this contact record' },
        { status: 403 }
      );
    }

    // 删除联系记录
    await prisma.contactRecord.delete({
      where: { id: contactId },
    });
    
    return NextResponse.json({ message: 'Contact record deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting contact record:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete contact record';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
} 
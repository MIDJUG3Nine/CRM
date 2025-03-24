import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// 定义联系记录验证模式
const contactRecordSchema = z.object({
  customerId: z.string().uuid(),
  method: z.enum(['EMAIL', 'PHONE', 'MEETING', 'VIDEO_CALL', 'OTHER']),
  content: z.string().min(1, 'Content is required'),
  date: z.string().datetime(),
  feedback: z.string().optional().nullable(),
  followUpPlan: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { message: 'You must be logged in to create contact records' },
        { status: 401 }
      );
    }

    // 解析和验证请求数据
    const data = await request.json();
    const validated = contactRecordSchema.parse(data);
    
    // 创建联系记录
    const contactRecord = await prisma.contactRecord.create({
      data: {
        ...validated,
        userId: user.userId, // 记录是谁创建的
      },
    });
    
    return NextResponse.json(contactRecord, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating contact record:', error);
    return NextResponse.json(
      { message: 'Failed to create contact record' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // 获取查询参数
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const where: any = {};
    if (customerId) {
      where.customerId = customerId;
    }
    
    // 基于用户角色确定可以查看的记录
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      // 如果不是管理员或经理，只能看自己的记录或分配给自己客户的记录
      where.OR = [
        { userId: user.userId },
        {
          customer: {
            salespersonId: user.userId
          }
        }
      ];
    }
    
    // 查询联系记录
    const [contactRecords, total] = await Promise.all([
      prisma.contactRecord.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          date: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.contactRecord.count({ where })
    ]);
    
    return NextResponse.json({
      records: contactRecords,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching contact records:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contact records';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
} 
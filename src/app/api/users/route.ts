import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  ApiError, 
  createApiHandler, 
  createPaginationResponse, 
  createSuccessResponse, 
  parsePagination, 
  parseQueryParams, 
  validateData 
} from '@/lib/api';
import { hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// 用户创建验证模式
const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['SALES', 'DESIGNER', 'PROJECT_MANAGER', 'SHAREHOLDER', 'ADMIN']),
  isApproved: z.boolean().default(false)
});

// 用户更新验证模式
const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(2).optional(),
  role: z.enum(['SALES', 'DESIGNER', 'PROJECT_MANAGER', 'SHAREHOLDER', 'ADMIN']).optional(),
  isApproved: z.boolean().optional()
});

/**
 * 获取用户列表
 * 仅限管理员访问
 */
export async function GET(request: Request) {
  try {
    // Convert Request to NextRequest for compatibility
    const req = request as unknown as NextRequest;
    
    // Check admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' }, 
        { status: 403 }
      );
    }
    
    const { page, pageSize, skip } = parsePagination(req);
    const params = parseQueryParams(req);
    
    // 构建过滤条件
    const where: any = {};
    
    // 应用过滤器
    if (params.role) {
      where.role = params.role;
    }
    
    if (params.isApproved) {
      where.isApproved = params.isApproved === 'true';
    }
    
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { email: { contains: params.search } }
      ];
    }
    
    // 构建排序条件
    const orderBy: any = {};
    if (params.sortBy) {
      const direction = params.sortDirection === 'desc' ? 'desc' : 'asc';
      orderBy[params.sortBy] = direction;
    } else {
      orderBy.createdAt = 'desc';
    }
    
    // 获取用户列表和总数
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tasks: true,
              customers: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);
    
    // 返回用户列表
    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * 创建新用户
 * 仅限管理员访问
 */
export const POST = createApiHandler({
  roles: ['ADMIN'],
  handler: async (req, { user }) => {
    // 解析请求数据
    const body = await req.json();
    
    // 验证数据
    const data = validateData(userCreateSchema, body);
    
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      throw new ApiError('Email already in use', { statusCode: 400 });
    }
    
    // 哈希密码
    const hashedPassword = await hashPassword(data.password);
    
    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return createSuccessResponse(newUser);
  }
});

/**
 * 获取单个用户详情
 * 处理GET /api/users/[id]请求
 */
export async function getUserById(req: NextRequest, userId: string) {
  return createApiHandler({
    roles: ['ADMIN'],
    handler: async (req, { user }) => {
      // 检查userId是否有效
      if (!userId || typeof userId !== 'string') {
        throw new ApiError('Invalid user ID', { statusCode: 400 });
      }
      
      // 获取用户详情
      const userDetails = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true,
          tasks: {
            where: {
              status: { not: 'COMPLETED' }
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true
            }
          },
          customers: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              email: true,
              status: true
            }
          },
          _count: {
            select: {
              tasks: true,
              customers: true,
              contactLogs: true
            }
          }
        }
      });
      
      if (!userDetails) {
        throw new ApiError('User not found', { statusCode: 404 });
      }
      
      return createSuccessResponse(userDetails);
    }
  })(req);
}

/**
 * 更新用户
 * 处理PATCH /api/users/[id]请求
 */
export async function updateUser(req: NextRequest, userId: string) {
  return createApiHandler({
    roles: ['ADMIN'],
    handler: async (req, { user }) => {
      // 检查userId是否有效
      if (!userId || typeof userId !== 'string') {
        throw new ApiError('Invalid user ID', { statusCode: 400 });
      }
      
      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!existingUser) {
        throw new ApiError('User not found', { statusCode: 404 });
      }
      
      // 解析并验证更新数据
      const body = await req.json();
      const updates = validateData(userUpdateSchema, body);
      
      // 如果更新了密码，需要哈希处理
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }
      
      // 如果更新了邮箱，需要检查是否已存在
      if (updates.email && updates.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updates.email }
        });
        
        if (emailExists) {
          throw new ApiError('Email already in use', { statusCode: 400 });
        }
      }
      
      // 更新用户
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isApproved: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      return createSuccessResponse(updatedUser);
    }
  })(req);
}

/**
 * 删除用户
 * 处理DELETE /api/users/[id]请求
 */
export async function deleteUser(req: NextRequest, userId: string) {
  return createApiHandler({
    roles: ['ADMIN'],
    handler: async (req, { user }) => {
      // 检查userId是否有效
      if (!userId || typeof userId !== 'string') {
        throw new ApiError('Invalid user ID', { statusCode: 400 });
      }
      
      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!existingUser) {
        throw new ApiError('User not found', { statusCode: 404 });
      }
      
      // 防止删除自己
      if (userId === user.id) {
        throw new ApiError('Cannot delete your own account', { statusCode: 403 });
      }
      
      try {
        // 删除用户
        await prisma.user.delete({
          where: { id: userId }
        });
        
        return createSuccessResponse({ success: true, message: 'User deleted successfully' });
      } catch (error) {
        // 处理外键约束错误
        throw new ApiError('Cannot delete user with associated data. Reassign or delete related data first.', { 
          statusCode: 400,
          details: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    }
  })(req);
}

export async function GET_TEST(request: Request) {
  try {
    // 获取当前会话信息
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 从URL获取查询参数
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');
    
    // 确保role是有效的枚举值
    let where: any = {};
    if (roleParam && ['SALES', 'DESIGNER', 'PROJECT_MANAGER', 'SHAREHOLDER', 'ADMIN'].includes(roleParam)) {
      where.role = roleParam;
    }
    
    // 从数据库获取用户列表
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // 如果没有用户数据，添加一个测试账户
    if (users.length === 0) {
      const testUsers = [
        {
          id: 'test-admin-id',
          name: 'Test Admin',
          email: 'testadmin@example.com',
          role: 'ADMIN',
          isApproved: true,
          createdAt: new Date()
        },
        {
          id: 'test-user-id',
          name: 'Test User',
          email: 'midjug3nine1@gmail.com',
          role: 'SALES',
          isApproved: true,
          createdAt: new Date()
        }
      ];
      
      return NextResponse.json({ users: testUsers });
    }
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
} 
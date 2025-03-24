/**
 * API工具类
 * 提供统一的API响应处理和错误处理
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { logger } from './logger';
import { getAuthenticatedUser } from './auth';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export interface ApiErrorOptions {
  statusCode?: number;
  details?: any;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * API错误类，用于统一处理API错误
 */
export class ApiError extends Error {
  statusCode: number;
  details?: any;
  logLevel: string;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options.statusCode || 400;
    this.details = options.details;
    this.logLevel = options.logLevel || 'error';
  }
}

/**
 * 检查用户权限
 */
export async function requireAuth(
  req: NextRequest, 
  roles?: string[]
): Promise<{ user: any }> {
  const user = await getAuthenticatedUser(req);
  
  if (!user) {
    throw new ApiError('Unauthorized', { statusCode: 401 });
  }

  if (roles && !roles.includes(user.role)) {
    throw new ApiError('Forbidden - Insufficient permissions', { 
      statusCode: 403,
      details: { required: roles, current: user.role }
    });
  }

  return { user };
}

/**
 * 验证请求数据
 */
export function validateData<T>(schema: ZodSchema<T>, data: any): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError('Validation error', {
        statusCode: 400,
        details: error.errors,
        logLevel: 'warn'
      });
    }
    throw error;
  }
}

/**
 * 解析查询参数
 */
export function parseQueryParams(req: NextRequest): Record<string, string> {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * 解析分页参数
 */
export function parsePagination(req: NextRequest, defaultPageSize: number = 10): { 
  page: number; 
  pageSize: number;
  skip: number;
} {
  const params = parseQueryParams(req);
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(params.pageSize || defaultPageSize.toString(), 10)));
  
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize
  };
}

/**
 * 创建分页响应
 */
export function createPaginationResponse<T>(
  data: T[], 
  total: number, 
  { page, pageSize }: { page: number; pageSize: number }
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  };
}

/**
 * 处理API请求
 */
export async function handleApiRequest(
  req: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 处理API错误
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    // 记录错误
    if (error.logLevel === 'debug') {
      logger.debug(`API Error: ${error.message}`, {
        statusCode: error.statusCode,
        details: error.details
      });
    } else if (error.logLevel === 'info') {
      logger.info(`API Error: ${error.message}`, {
        statusCode: error.statusCode,
        details: error.details
      });
    } else if (error.logLevel === 'warn') {
      logger.warn(`API Error: ${error.message}`, {
        statusCode: error.statusCode,
        details: error.details
      });
    } else {
      logger.error(`API Error: ${error.message}`, {
        statusCode: error.statusCode,
        details: error.details
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details
      },
      { status: error.statusCode }
    );
  }
  
  // 未知错误
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`Unhandled API Error: ${message}`, {
    stack: error instanceof Error ? error.stack : String(error)
  });
  
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
    },
    { status: 500 }
  );
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T): NextResponse {
  return NextResponse.json({
    success: true,
    data
  });
}

/**
 * API处理器工厂
 * 创建一个API路由处理器，统一处理认证、授权、错误处理
 */
export function createApiHandler(options: {
  roles?: string[];
  handler: (req: NextRequest, context: { user: any }) => Promise<NextResponse>;
}) {
  return async (req: NextRequest) => {
    return handleApiRequest(req, async () => {
      const { user } = await requireAuth(req, options.roles);
      return options.handler(req, { user });
    });
  };
} 
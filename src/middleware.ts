import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';
import { logger } from './lib/logger';
import { recordApiPerformance } from './lib/metrics';
import { rateLimiter } from './lib/rate-limiter';

// 白名单路径 - 不需要身份验证
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/login',
  '/register'
];

// 路径与所需角色的映射
const ROLE_PROTECTED_PATHS: Record<string, string[]> = {
  '/api/users': ['ADMIN'],
  '/api/analytics': ['ADMIN', 'SHAREHOLDER'],
  '/users': ['ADMIN'],
  '/analytics': ['ADMIN', 'SHAREHOLDER'],
};

// 记录API请求的中间件
async function logAPIRequest(req: NextRequest) {
  // 只处理API请求
  if (!req.nextUrl.pathname.startsWith('/api/')) return;

  const startTime = performance.now();
  
  // 在请求对象中保存开始时间，以便在响应时计算持续时间
  req.headers.set('x-request-start-time', startTime.toString());
}

// 记录API响应的中间件
async function logAPIResponse(req: NextRequest, res: NextResponse) {
  // 只处理API请求
  if (!req.nextUrl.pathname.startsWith('/api/')) return res;

  // 获取开始时间
  const startTimeStr = req.headers.get('x-request-start-time');
  if (!startTimeStr) return res;
  
  const startTime = parseFloat(startTimeStr);
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // 记录API调用
  logger.api(req, duration, res.status);
  
  // 记录API性能指标
  const url = new URL(req.url);
  recordApiPerformance(url.pathname, req.method, res.status, duration);
  
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // 记录API请求
  await logAPIRequest(req);
  
  // 应用速率限制
  const rateLimitResponse = await rateLimiter(req);
  if (rateLimitResponse) {
    return await logAPIResponse(req, rateLimitResponse);
  }
  
  // 记录请求路径和cookie状态 - 用于调试
  console.log(`[Middleware] 请求路径: ${pathname}`);
  console.log(`[Middleware] 所有cookies: ${req.cookies.toString()}`);
  
  // 身份验证逻辑
  // 如果是公开路径，直接放行
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    console.log(`[Middleware] 公开路径: ${pathname} - 无需验证`);
    const response = NextResponse.next();
    return await logAPIResponse(req, response);
  }
  
  // 对于/dashboard路径的特殊处理
  if (pathname.startsWith('/dashboard')) {
    console.log(`[Middleware] 正在尝试访问Dashboard: ${pathname}`);
  }
  
  // 验证令牌 - 修复：尝试从两个可能的cookie名称获取token
  let token = req.cookies.get('token')?.value;
  if (!token) {
    token = req.cookies.get('auth_token')?.value;
  }
  console.log(`[Middleware] token状态: ${token ? '存在' : '不存在'}`);
  console.log(`[Middleware] auth_token状态: ${req.cookies.get('auth_token')?.value ? '存在' : '不存在'}`);
  
  if (!token) {
    // 记录失败原因
    console.log(`[Middleware] 认证失败: 未找到token cookie`);
    
    // 如果是API请求，返回401错误
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      );
      return await logAPIResponse(req, response);
    }
    
    // 否则重定向到登录页
    const response = NextResponse.redirect(new URL('/login', req.url));
    return await logAPIResponse(req, response);
  }
  
  try {
    // 验证令牌并获取用户数据
    console.log(`[Middleware] 待验证的令牌: ${token.substring(0, 10)}...`); // 只显示部分令牌以防止泄露
    const decoded = await verifyToken(token);
    console.log(`[Middleware] 令牌验证结果: ${decoded ? '有效' : '无效'}, Payload: ${JSON.stringify(decoded)}`);
    
    if (!decoded) {
      throw new Error('Invalid token - empty payload');
    }
    
    // 设置响应头，将用户ID传递给请求处理程序
    const response = NextResponse.next();
    response.headers.set('X-User-ID', decoded.userId);
    response.headers.set('X-User-Role', decoded.role);
    
    // 检查角色保护的路径
    // eslint-disable-next-line no-restricted-syntax
    for (const [protectedPath, allowedRoles] of Object.entries(ROLE_PROTECTED_PATHS)) {
      if (pathname.startsWith(protectedPath) && !allowedRoles.includes(decoded.role)) {
        // 如果是API请求，返回403错误
        if (pathname.startsWith('/api/')) {
          const response = NextResponse.json(
            { error: 'Forbidden: Insufficient permissions' },
            { status: 403 }
          );
          return await logAPIResponse(req, response);
        }
        
        // 否则重定向到主页
        const response = NextResponse.redirect(new URL('/', req.url));
        return await logAPIResponse(req, response);
      }
    }
    
    return await logAPIResponse(req, response);
  } catch (error) {
    // 令牌无效
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      );
      return await logAPIResponse(req, response);
    }
    
    // 重定向到登录页
    const response = NextResponse.redirect(new URL('/login', req.url));
    return await logAPIResponse(req, response);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 
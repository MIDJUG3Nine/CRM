import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export interface TokenPayload {
  userId: string;
  role: string;
  name?: string;
  iat?: number;
  exp?: number;
}

// NextAuth配置选项
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.isApproved) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error('NextAuth authorize error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
};

/**
 * Extracts the JWT token from the request's cookies
 */
export function extractTokenFromRequest(request: Request | NextRequest): string | undefined {
  try {
    // 如果是NextRequest，直接使用cookies API
    if ('cookies' in request && typeof request.cookies.get === 'function') {
      const nextReq = request as NextRequest;
      
      // 首先尝试从token cookie获取
      let token = nextReq.cookies.get('token')?.value;
      
      // 如果没有，尝试从auth_token cookie获取
      if (!token) {
        token = nextReq.cookies.get('auth_token')?.value;
      }
      
      console.log(`[extractTokenFromRequest] Token from cookies API: ${token ? 'SUCCESS' : 'FAILED'}`);
      return token;
    }
    
    // 回退到解析cookie头
    const cookieHeader = request.headers.get('cookie') || '';
    console.log(`[extractTokenFromRequest] Cookie header: ${cookieHeader}`);
    
    // 先尝试解析token cookie
    let tokenCookie = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('token='));
    
    // 如果没有找到，尝试解析auth_token cookie
    if (!tokenCookie) {
      tokenCookie = cookieHeader
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('auth_token='));
        
      console.log(`[extractTokenFromRequest] Parsing from auth_token: ${tokenCookie ? 'SUCCESS' : 'FAILED'}`);
    } else {
      console.log(`[extractTokenFromRequest] Parsing from token: ${tokenCookie ? 'SUCCESS' : 'FAILED'}`);
    }
  
    if (!tokenCookie) {
      console.log('[extractTokenFromRequest] Token cookie not found');
      return undefined;
    }
    
    const token = tokenCookie.split('=')[1];
    return token;
  } catch (error) {
    console.error('[extractTokenFromRequest] 提取token时出错:', error);
    return undefined;
  }
}

/**
 * Verifies the JWT token and returns the payload
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    console.log('[verifyToken] Starting token verification');
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      console.error('[verifyToken] JWT_SECRET not defined in environment variables');
      return null;
    }

    // 移除可能的引号
    let cleanToken = token;
    if (cleanToken.startsWith('"') && cleanToken.endsWith('"')) {
      cleanToken = cleanToken.slice(1, -1);
    }

    console.log(`[verifyToken] Token length: ${cleanToken.length}`);
    
    // 创建密钥
    const key = new TextEncoder().encode(secretKey);
    
    // 验证token
    try {
      const { payload } = await jwtVerify(cleanToken, key);
      
      console.log(`[verifyToken] Successfully parsed payload: ${JSON.stringify(payload)}`);
      
      // 验证payload结构
      if (!payload || typeof payload.userId !== 'string' || typeof payload.role !== 'string') {
        console.error('[verifyToken] Invalid token payload structure');
        return null;
      }
      
      // 转换为TokenPayload并返回
      return {
        userId: payload.userId as string,
        role: payload.role as string,
        name: payload.name as string | undefined,
        iat: payload.iat as number | undefined,
        exp: payload.exp as number | undefined
      };
    } catch (jwtError) {
      console.error('[verifyToken] JWT validation error:', jwtError);
      
      // 检查是否是过期错误
      if (jwtError instanceof Error && jwtError.message.includes('expired')) {
        console.log('[verifyToken] Token expired, needs refresh');
      }
      
      return null;
    }
  } catch (error) {
    console.error('[verifyToken] Token verification error:', error);
    return null;
  }
}

/**
 * Creates a JWT token
 */
export async function createToken(payload: {
  userId: string;
  role: string;
  name?: string;
}, expiresIn = '7d'): Promise<string> {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error('JWT_SECRET not defined in environment variables');
  }
  
  // 创建密钥
  const key = new TextEncoder().encode(secretKey);
  
  // 计算过期时间（秒）
  let expireSeconds = 7 * 24 * 60 * 60; // 默认7天
  
  if (typeof expiresIn === 'string') {
    if (expiresIn.endsWith('d')) {
      expireSeconds = parseInt(expiresIn.slice(0, -1)) * 24 * 60 * 60;
    } else if (expiresIn.endsWith('h')) {
      expireSeconds = parseInt(expiresIn.slice(0, -1)) * 60 * 60;
    } else if (expiresIn.endsWith('m')) {
      expireSeconds = parseInt(expiresIn.slice(0, -1)) * 60;
    } else if (expiresIn.endsWith('s')) {
      expireSeconds = parseInt(expiresIn.slice(0, -1));
    }
  }
  
  // 创建JWT
  const jwt = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expireSeconds)
    .sign(key);
  
  return jwt;
}

/**
 * Gets the current user from the request cookies
 */
export async function getCurrentUser(request: NextRequest) {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    return null;
  }
  
  return await verifyToken(token);
}

/**
 * 别名: 获取认证用户 (兼容现有API调用)
 */
export const getAuthenticatedUser = getCurrentUser;

/**
 * 对密码进行哈希处理
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
} 
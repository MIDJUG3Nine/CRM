import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { addUserConnection, removeUserConnection } from '@/lib/websocket';

// 处理WebSocket连接请求
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  
  // 验证令牌
  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'Authentication required' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const user = await verifyToken(token);
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Invalid token' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // 检查是否支持WebSocket
    const { socket, response } = await new Promise<{ socket: WebSocket, response: Response }>((resolve, reject) => {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        reject(new Error('Not a WebSocket handshake'));
        return;
      }
      
      // 获取相关WebSocket握手请求头
      const connectionHeader = request.headers.get('Connection');
      const keyHeader = request.headers.get('Sec-WebSocket-Key');
      const versionHeader = request.headers.get('Sec-WebSocket-Version');
      
      if (!connectionHeader?.includes('Upgrade') || !keyHeader || versionHeader !== '13') {
        reject(new Error('Invalid WebSocket headers'));
        return;
      }
      
      // 创建WebSocket连接
      const socket = new WebSocket('wss://' + request.headers.get('Host'), { headers: request.headers });
      
      // 设置连接事件处理程序
      socket.addEventListener('open', () => {
        // 保存连接
        addUserConnection(user.userId, socket);
        
        // 发送欢迎消息
        socket.send(JSON.stringify({
          type: 'connected',
          userId: user.userId,
          timestamp: new Date().toISOString()
        }));
        
        // 设置关闭事件处理程序
        socket.addEventListener('close', () => {
          removeUserConnection(user.userId, socket);
        });
        
        // 返回WebSocket响应
        const response = new Response(null, {
          status: 101, // Switching Protocols
          headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
            'Sec-WebSocket-Accept': computeAccept(keyHeader), // 这里需要实现computeAccept函数
          }
        });
        
        resolve({ socket, response });
      });
      
      socket.addEventListener('error', (error) => {
        reject(error);
      });
    });
    
    return response;
  } catch (error) {
    console.error('WebSocket initialization error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to establish WebSocket connection' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 计算WebSocket握手响应的Accept值
function computeAccept(key: string): string {
  // 实际实现需要使用crypto模块
  // 这里提供简化版本，生产环境需要正确实现
  return Buffer.from(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').toString('base64');
} 
/**
 * WebSocket客户端工具
 * 用于管理前端与WebSocket服务器的连接
 */

// 最大重连尝试次数
const MAX_RECONNECT_ATTEMPTS = 10;

// 基础重连延迟(毫秒)
const BASE_RECONNECT_DELAY = 1000;

// 最大重连延迟(毫秒)
const MAX_RECONNECT_DELAY = 30000;

// 心跳间隔(毫秒)
const HEARTBEAT_INTERVAL = 30000;

// 正在进行的WebSocket连接
let activeSocket: WebSocket | null = null;

// 重连尝试次数
let reconnectAttempts = 0;

// 上次连接状态
let wasConnected = false;

// 心跳定时器
let heartbeatInterval: NodeJS.Timeout | null = null;

// 重连定时器
let reconnectTimer: NodeJS.Timeout | null = null;

// 用于存储待发送的消息队列
const messageQueue: string[] = [];

// 连接状态监听器
type ConnectionListener = (connected: boolean) => void;
const connectionListeners: ConnectionListener[] = [];

// 消息监听器
type MessageListener = (data: any) => void;
const messageListeners: MessageListener[] = [];

/**
 * 设置WebSocket连接
 * @param token 用户身份令牌
 * @returns WebSocket实例
 */
export function setupWebSocket(token: string): WebSocket {
  // 如果已有活动连接，返回该连接
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    return activeSocket;
  }

  // 重置重连尝试次数
  reconnectAttempts = 0;

  // 创建WebSocket连接
  const socket = createWebSocketConnection(token);
  
  return socket;
}

/**
 * 关闭WebSocket连接
 */
export function closeWebSocket(): void {
  // 清除重连定时器
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (activeSocket) {
    // 移除所有事件监听器
    activeSocket.onopen = null;
    activeSocket.onclose = null;
    activeSocket.onerror = null;
    activeSocket.onmessage = null;
    
    // 关闭连接
    if (activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.close();
    }
    
    activeSocket = null;
  }
  
  // 清除心跳定时器
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  // 通知状态变化
  if (wasConnected) {
    wasConnected = false;
    notifyConnectionChange(false);
  }
}

/**
 * 添加连接状态监听器
 * @param listener 监听函数
 */
export function addConnectionListener(listener: ConnectionListener): void {
  connectionListeners.push(listener);
  
  // 立即通知当前状态
  const isConnected = !!(activeSocket && activeSocket.readyState === WebSocket.OPEN);
  listener(isConnected);
}

/**
 * 移除连接状态监听器
 * @param listener 要移除的监听函数
 */
export function removeConnectionListener(listener: ConnectionListener): void {
  const index = connectionListeners.indexOf(listener);
  if (index !== -1) {
    connectionListeners.splice(index, 1);
  }
}

/**
 * 添加消息监听器
 * @param listener 监听函数
 */
export function addMessageListener(listener: MessageListener): void {
  messageListeners.push(listener);
}

/**
 * 移除消息监听器
 * @param listener 要移除的监听函数
 */
export function removeMessageListener(listener: MessageListener): void {
  const index = messageListeners.indexOf(listener);
  if (index !== -1) {
    messageListeners.splice(index, 1);
  }
}

/**
 * 通知连接状态变化
 */
function notifyConnectionChange(connected: boolean): void {
  connectionListeners.forEach(listener => {
    try {
      listener(connected);
    } catch (error) {
      console.error('Error in connection listener:', error);
    }
  });
}

/**
 * 通知接收到新消息
 */
function notifyMessageReceived(data: any): void {
  messageListeners.forEach(listener => {
    try {
      listener(data);
    } catch (error) {
      console.error('Error in message listener:', error);
    }
  });
}

/**
 * 创建WebSocket连接
 * @param token 用户身份令牌
 * @returns WebSocket实例
 */
function createWebSocketConnection(token: string): WebSocket {
  // 如果已经有重连计时器，清除它
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  // 构建WebSocket URL，添加token参数
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/websocket?token=${token}`;
  
  // 创建WebSocket连接
  const socket = new WebSocket(wsUrl);
  
  // 设置连接建立时的回调
  socket.onopen = () => {
    console.log('WebSocket连接已建立');
    
    // 重置重连尝试次数
    reconnectAttempts = 0;
    
    // 发送所有排队的消息
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      if (message && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    }
    
    // 设置心跳定时器
    setupHeartbeat(socket);
    
    // 通知连接状态变化
    if (!wasConnected) {
      wasConnected = true;
      notifyConnectionChange(true);
    }
  };
  
  // 设置连接关闭时的回调
  socket.onclose = (event) => {
    console.log(`WebSocket连接已关闭: ${event.code} ${event.reason}`);
    
    // 通知连接状态变化
    if (wasConnected) {
      wasConnected = false;
      notifyConnectionChange(false);
    }
    
    // 如果不是人为关闭，尝试重连
    handleReconnect(token);
    
    // 清除心跳定时器
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };
  
  // 设置连接错误时的回调
  socket.onerror = (error) => {
    console.error('WebSocket连接错误:', error);
  };
  
  // 设置收到消息时的回调
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('收到WebSocket消息:', data);
      
      // 处理心跳响应
      if (data.type === 'pong') {
        console.log('收到心跳响应');
      } else {
        // 通知接收到新消息
        notifyMessageReceived(data);
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  };
  
  // 保存活动连接
  activeSocket = socket;
  
  return socket;
}

/**
 * 处理重连逻辑
 */
function handleReconnect(token: string): void {
  // 检查网络连接
  if (!navigator.onLine) {
    console.log('网络离线，等待网络恢复...');
    
    // 监听网络恢复事件
    const handleOnline = () => {
      console.log('网络已恢复，尝试重新连接...');
      window.removeEventListener('online', handleOnline);
      
      // 重置重连尝试
      reconnectAttempts = 0;
      createWebSocketConnection(token);
    };
    
    window.addEventListener('online', handleOnline);
    return;
  }
  
  // 如果超过最大重连次数，停止重连
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('达到最大重连尝试次数，停止重连');
    return;
  }
  
  // 计算指数退避重连延迟
  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts),
    MAX_RECONNECT_DELAY
  );
  
  console.log(`将在${delay}ms后尝试重新连接...尝试${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
  
  // 设置重连定时器
  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    createWebSocketConnection(token);
  }, delay);
}

/**
 * 设置心跳机制
 */
function setupHeartbeat(socket: WebSocket): void {
  // 清除现有心跳
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // 设置新的心跳
  heartbeatInterval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      // 发送心跳
      socket.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
    } else {
      // 如果连接已关闭，清除心跳
      clearInterval(heartbeatInterval!);
      heartbeatInterval = null;
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * 通过WebSocket发送消息
 * @param message 要发送的消息对象
 * @returns 是否成功发送
 */
export function sendMessage(message: unknown): boolean {
  const messageStr = JSON.stringify(message);
  
  // 如果连接已建立，直接发送
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    try {
      activeSocket.send(messageStr);
      return true;
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      messageQueue.push(messageStr);
      return false;
    }
  } else {
    // 否则将消息加入队列
    messageQueue.push(messageStr);
    console.warn('WebSocket连接未建立，消息已加入队列');
    return false;
  }
}

/**
 * 获取连接状态
 * @returns 当前WebSocket连接状态
 */
export function getConnectionState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'NONE' {
  if (!activeSocket) return 'NONE';
  
  switch (activeSocket.readyState) {
    case WebSocket.CONNECTING:
      return 'CONNECTING';
    case WebSocket.OPEN:
      return 'OPEN';
    case WebSocket.CLOSING:
      return 'CLOSING';
    case WebSocket.CLOSED:
      return 'CLOSED';
    default:
      return 'NONE';
  }
}

/**
 * 强制重新连接WebSocket
 * @param token 用户身份令牌
 */
export function reconnectWebSocket(token: string): void {
  closeWebSocket();
  setupWebSocket(token);
} 
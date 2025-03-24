import { useState, useEffect, useCallback } from 'react';
import { setupWebSocket } from '@/lib/websocket-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

interface NotificationsHookResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useNotifications(): NotificationsHookResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications?limit=10');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // 标记通知为已读
  const markAsRead = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // 更新本地状态
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      );
      
      // 减少未读计数
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // 标记所有通知为已读
  const markAllAsRead = async (): Promise<void> => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      
      // 更新本地状态
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      // 重置未读计数
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // 删除通知
  const deleteNotification = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
      
      // 更新本地状态
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // 如果删除的是未读通知，更新计数
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // 刷新通知
  const refresh = useCallback(async (): Promise<void> => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // 初始化WebSocket连接
  useEffect(() => {
    // 获取认证令牌
    const getToken = async () => {
      try {
        const response = await fetch('/api/auth/token');
        if (!response.ok) {
          throw new Error('Failed to get token');
        }
        const { token } = await response.json();
        return token;
      } catch (error) {
        console.error('Error getting token for WebSocket:', error);
        return null;
      }
    };

    // 设置WebSocket连接
    const setupConnection = async () => {
      const token = await getToken();
      if (!token) return;

      const ws = setupWebSocket(token);
      
      // 处理消息
      ws.addEventListener('message', (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // 处理新通知
          if (message.type === 'notification') {
            // 添加新通知到列表
            setNotifications(prev => [message.data, ...prev.slice(0, 9)]);
            
            // 更新未读计数
            setUnreadCount(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });
      
      setSocket(ws);
      
      return ws;
    };

    // 设置连接并在组件卸载时关闭
    let ws: WebSocket | null = null;
    setupConnection().then(websocket => {
      ws = websocket || null;
    });
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // 初始获取通知和设置刷新间隔
  useEffect(() => {
    fetchNotifications();
    
    // 设置定期刷新
    const intervalId = setInterval(fetchNotifications, 60000); // 每分钟刷新一次
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
} 
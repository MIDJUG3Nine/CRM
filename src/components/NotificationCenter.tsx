import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiBell, FiX, FiCheck, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { useNotifications } from '@/hooks/useNotifications';

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

interface NotificationCenterProps {
  userId: string;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    refresh
  } = useNotifications();

  // 处理点击外部关闭通知中心
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理通知点击 - 标记为已读并导航到相关内容
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  // 处理删除通知
  const handleDeleteNotification = async (event: React.MouseEvent, notificationId: string) => {
    event.stopPropagation();
    await deleteNotification(notificationId);
  };

  // 获取通知相关项目的链接
  const getNotificationLink = (notification: Notification) => {
    if (!notification.relatedId || !notification.relatedType) {
      return '#';
    }

    switch (notification.relatedType) {
      case 'task':
        return `/dashboard/tasks/${notification.relatedId}`;
      case 'customer':
        return `/dashboard/customers/${notification.relatedId}`;
      case 'contact':
        return `/dashboard/contacts/${notification.relatedId}`;
      default:
        return '#';
    }
  };

  // 格式化通知时间
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} 分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours} 小时前`;
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <div className="bg-blue-500 p-2 rounded-full text-white">TA</div>;
      case 'TASK_STATUS_UPDATED':
        return <div className="bg-green-500 p-2 rounded-full text-white">TS</div>;
      case 'TASK_COMMENT_ADDED':
        return <div className="bg-purple-500 p-2 rounded-full text-white">TC</div>;
      case 'TASK_DUE_SOON':
        return <div className="bg-yellow-500 p-2 rounded-full text-white">TD</div>;
      case 'TASK_OVERDUE':
        return <div className="bg-red-500 p-2 rounded-full text-white">TO</div>;
      case 'CUSTOMER_ADDED':
      case 'CUSTOMER_UPDATED':
        return <div className="bg-indigo-500 p-2 rounded-full text-white">CU</div>;
      case 'CONTACT_ADDED':
        return <div className="bg-teal-500 p-2 rounded-full text-white">CA</div>;
      default:
        return <div className="bg-gray-500 p-2 rounded-full text-white">N</div>;
    }
  };

  return (
    <div className="relative" ref={notificationRef}>
      {/* 通知铃铛按钮 */}
      <button
        className="p-2 relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="打开通知"
      >
        <FiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知下拉框 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-md shadow-lg z-50 border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">通知</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                aria-label="全部标为已读"
              >
                <FiCheckCircle className="mr-1" />
                全部标为已读
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">正在加载通知...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">加载通知失败</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">暂无通知</div>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer flex ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <Link href={getNotificationLink(notification)} className="flex-1 flex" onClick={() => handleNotificationClick(notification)}>
                    <div className="mr-3 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mb-1">{notification.content}</p>
                      <p className="text-xs text-gray-500">{formatNotificationTime(notification.createdAt)}</p>
                    </div>
                  </Link>
                  <div className="ml-2 flex flex-col space-y-1">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="text-gray-400 hover:text-blue-600 p-1"
                        aria-label="标为已读"
                      >
                        <FiCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      aria-label="删除通知"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {notifications.length > 0 && (
            <div className="p-3 text-center border-t border-gray-100">
              <Link
                href="/dashboard/notifications"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => setIsOpen(false)}
              >
                查看全部通知
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
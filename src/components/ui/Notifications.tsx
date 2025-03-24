"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

// 通知类型
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 通知属性接口
interface NotificationProps {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

// 单个通知组件
function Notification({ id, type, title, message, duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  // 配置不同类型通知的样式和图标
  const config = {
    success: {
      icon: <FiCheckCircle className="h-6 w-6" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      iconColor: 'text-green-500',
      progressColor: 'bg-green-500',
    },
    error: {
      icon: <FiAlertCircle className="h-6 w-6" />,
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500',
      progressColor: 'bg-red-500',
    },
    warning: {
      icon: <FiAlertTriangle className="h-6 w-6" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-500',
      progressColor: 'bg-yellow-500',
    },
    info: {
      icon: <FiInfo className="h-6 w-6" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
      progressColor: 'bg-blue-500',
    },
  };

  const { icon, bgColor, textColor, borderColor, iconColor, progressColor } = config[type];

  // 关闭通知的处理函数
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // 关闭动画完成后移除
  }, [id, onClose]);

  // 自动关闭计时器
  useEffect(() => {
    if (!isVisible || isPaused || duration === Infinity) return;

    const startTime = Date.now();
    const intervalTime = 16; // 大约60fps
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = 100 - (elapsed / duration) * 100;
      
      if (newProgress <= 0) {
        clearInterval(interval);
        handleClose();
      } else {
        setProgress(newProgress);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [duration, handleClose, isVisible, isPaused]);

  return (
    <div
      className={`max-w-sm w-full ${bgColor} ${textColor} ${borderColor} border rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${iconColor}`}>{icon}</div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{title}</p>
            {message && <p className="mt-1 text-sm opacity-80">{message}</p>}
          </div>
          <button
            type="button"
            className={`${textColor} hover:bg-opacity-20 hover:bg-gray-500 rounded-md p-1.5 inline-flex items-center justify-center focus:outline-none`}
            onClick={handleClose}
            aria-label="关闭"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {duration !== Infinity && (
        <div className="h-1 w-full bg-gray-200 bg-opacity-40">
          <div
            className={`h-1 ${progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// 通知容器组件
function NotificationsContainer() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  // 关闭通知的处理函数
  const handleClose = useCallback((id: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== id)
    );
  }, []);

  // 事件监听器，用于接收通知请求
  useEffect(() => {
    const handleNotificationEvent = (event: CustomEvent) => {
      const { notification } = event.detail;
      setNotifications((prev) => [...prev, { ...notification, onClose: handleClose }]);
    };

    // 注册自定义事件
    window.addEventListener('showNotification' as any, handleNotificationEvent as EventListener);

    return () => {
      window.removeEventListener('showNotification' as any, handleNotificationEvent as EventListener);
    };
  }, [handleClose]);

  // 如果没有通知，则不渲染
  if (notifications.length === 0) return null;

  // 使用 Portal 渲染到 body
  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-4 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto animate-slideInRight">
          <Notification {...notification} />
        </div>
      ))}
    </div>,
    document.body
  );
}

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// 通知函数
interface NotificationOptions {
  title: string;
  message?: string;
  duration?: number;
}

// 显示通知的工具函数
function showNotification(type: NotificationType, options: NotificationOptions) {
  const notification = {
    id: generateId(),
    type,
    ...options,
  };

  // 触发自定义事件
  const event = new CustomEvent('showNotification', {
    detail: { notification },
  });

  window.dispatchEvent(event);
}

// 导出通知函数
export const toast = {
  success: (options: NotificationOptions) => showNotification('success', options),
  error: (options: NotificationOptions) => showNotification('error', options),
  warning: (options: NotificationOptions) => showNotification('warning', options),
  info: (options: NotificationOptions) => showNotification('info', options),
};

// 导出通知容器组件
export { NotificationsContainer }; 
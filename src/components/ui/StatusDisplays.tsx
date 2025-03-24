import React from 'react';
import { FiAlertCircle, FiAlertTriangle, FiFileText, FiInbox, FiSearch, FiWifiOff } from 'react-icons/fi';
import { LoadingButton } from './LoadingState';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon = <FiInbox className="w-12 h-12 text-gray-400" />,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-12'} ${className}`}>
      <div className="animate-fadeIn">
        {icon}
        <h3 className={`mt-3 ${compact ? 'text-lg' : 'text-xl'} font-medium text-gray-900`}>{title}</h3>
        {message && <p className="mt-1 text-sm text-gray-500 max-w-md">{message}</p>}
        
        {action && (
          <div className="mt-4">
            <button
              type="button"
              className="button-press-effect inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 搜索结果为空组件
export function NoSearchResults({
  searchTerm,
  onReset,
  compact = false,
}: {
  searchTerm: string;
  onReset: () => void;
  compact?: boolean;
}) {
  return (
    <EmptyState
      title="未找到结果"
      message={`没有找到与 "${searchTerm}" 相关的结果，请尝试其他搜索条件`}
      icon={<FiSearch className="w-12 h-12 text-gray-400" />}
      action={{ label: "清除搜索", onClick: onReset }}
      compact={compact}
    />
  );
}

// 暂无数据组件
export function NoData({
  title = "暂无数据",
  message = "当前没有可显示的数据",
  action,
  compact = false,
}: {
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}) {
  return (
    <EmptyState
      title={title}
      message={message}
      icon={<FiFileText className="w-12 h-12 text-gray-400" />}
      action={action}
      compact={compact}
    />
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
  retryLabel?: string;
  isRetrying?: boolean;
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "发生错误",
  message,
  onRetry,
  showRetry = true,
  retryLabel = "重试",
  isRetrying = false,
  icon = <FiAlertCircle className="w-12 h-12 text-red-500" />,
  compact = false,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-12'} ${className}`}>
      <div className="animate-fadeIn">
        {icon}
        <h3 className={`mt-3 ${compact ? 'text-lg' : 'text-xl'} font-medium text-gray-900`}>{title}</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-md">{message}</p>
        
        {onRetry && showRetry && (
          <div className="mt-4">
            <LoadingButton
              type="button"
              className="button-press-effect inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onRetry}
              isLoading={isRetrying}
              loadingText="正在重试"
            >
              {retryLabel}
            </LoadingButton>
          </div>
        )}
      </div>
    </div>
  );
}

// 网络错误组件
export function NetworkError({
  onRetry,
  isRetrying = false,
  compact = false,
}: {
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
}) {
  return (
    <ErrorState
      title="网络连接错误"
      message="无法连接到服务器，请检查您的网络连接并重试"
      onRetry={onRetry}
      isRetrying={isRetrying}
      icon={<FiWifiOff className="w-12 h-12 text-red-500" />}
      compact={compact}
    />
  );
}

// 服务器错误组件
export function ServerError({
  message = "服务器处理请求时出错，请稍后重试",
  onRetry,
  isRetrying = false,
  compact = false,
}: {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
}) {
  return (
    <ErrorState
      title="服务器错误"
      message={message}
      onRetry={onRetry}
      isRetrying={isRetrying}
      icon={<FiAlertTriangle className="w-12 h-12 text-red-500" />}
      compact={compact}
    />
  );
}

// 简单错误提示组件
export function SimpleError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-4 bg-red-50 text-red-700 rounded-md animate-fadeIn">
      <FiAlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
} 
import React from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

interface ApiErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ApiErrorState: React.FC<ApiErrorStateProps> = ({
  title = '加载失败',
  message,
  onRetry,
  isRetrying = false
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 text-center max-w-md mx-auto my-8">
      <div className="flex justify-center mb-4">
        <FiAlertCircle className="text-red-500 h-12 w-12" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 mb-6">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? (
            <>
              <div 
                className="w-4 h-4 mr-2 border-2 border-t-white border-r-white border-b-transparent border-l-transparent rounded-full animate-spin"
                style={{ aspectRatio: '1/1' }}
              ></div>
              重试中...
            </>
          ) : (
            <>
              <FiRefreshCw className="mr-2" />
              重试
            </>
          )}
        </button>
      )}
    </div>
  );
}; 
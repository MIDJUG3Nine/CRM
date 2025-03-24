import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  text?: string;
  transparent?: boolean;
}

export const LoadingState = ({ size = 'md', fullPage = false, text = '加载中...', transparent = false }: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };
  
  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  const content = (
    <div className="flex flex-col items-center justify-center">
      <div 
        className={`${sizeClasses[size]} border-t-indigo-600 border-r-indigo-600 border-b-indigo-300 border-l-indigo-300 border-solid rounded-full animate-spin`}
        style={{ aspectRatio: '1/1' }}
      ></div>
      {text && (
        <p className={`mt-2 ${textClasses[size]} text-gray-700 font-medium`}>{text}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 ${transparent ? 'bg-white/50' : 'bg-white'}`}>
        {content}
      </div>
    );
  }

  return content;
};

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({
  isLoading,
  loadingText = '处理中',
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      className={`relative px-4 py-2 rounded font-medium transition-all ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      <span className={`transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-t-current border-current/20 rounded-full animate-spin mr-2" />
          {loadingText}
        </span>
      )}
    </button>
  );
}

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// 添加到 globals.css 的动画定义
// @keyframes fadeIn {
//   from { opacity: 0; }
//   to { opacity: 1; }
// } 
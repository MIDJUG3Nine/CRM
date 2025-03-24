"use client";

import { useEffect } from 'react';

// 客户端初始化组件，用于设置localStorage中的主题为light
export default function ClientInit() {
  useEffect(() => {
    // 设置浅色模式，移除已有的主题相关类名
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  return null;
} 
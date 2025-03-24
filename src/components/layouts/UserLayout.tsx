'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserLayoutProps {
  children: ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const pathname = usePathname();
  
  const navLinks = [
    { href: '/dashboard', label: '仪表盘' },
    { href: '/tasks', label: '任务' },
    { href: '/customers', label: '客户' },
    { href: '/reports', label: '报表' },
    { href: '/user/profile', label: '个人资料' },
    { href: '/user/notification-settings', label: '通知设置' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">CRM 系统</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">欢迎回来</span>
            <Link href="/api/auth/logout" className="text-sm text-red-600 hover:text-red-800">
              退出登录
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 flex">
        {/* Sidebar */}
        <aside className="w-64 mr-8">
          <nav className="bg-white shadow rounded-lg p-4">
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block px-4 py-2 rounded-md ${
                      pathname === link.href
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
} 
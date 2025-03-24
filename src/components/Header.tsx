'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMenu, FiX, FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import { toast } from '@/components/ui/Notifications';

interface HeaderProps {
  toggleSidebar: () => void;
  sidebarOpen: boolean;
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, sidebarOpen, user }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const handleLogout = async () => {
    // 清除localStorage中的token
    localStorage.removeItem('auth_token');
    
    // 清除cookie中的token
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // 显示成功消息
    toast.success({
      title: '登出成功',
      message: '您已成功登出系统'
    });
    
    // 重定向到登录页
    window.location.href = '/login';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white shadow h-16 flex items-center transition-all duration-300">
      <div className="container mx-auto px-4 h-full flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
            aria-label={sidebarOpen ? "关闭侧边栏" : "打开侧边栏"}
          >
            {sidebarOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
          
          <Link href="/dashboard" className="ml-4 text-xl font-semibold text-blue-600">
            CRM系统
          </Link>
          
          {pathname && (
            <div className="hidden md:flex ml-8 space-x-4">
              <Link 
                href="/dashboard" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/dashboard' 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                仪表盘
              </Link>
              <Link 
                href="/dashboard/customers" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname.startsWith('/dashboard/customers') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                客户管理
              </Link>
              <Link 
                href="/dashboard/tasks" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname.startsWith('/dashboard/tasks') 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                任务管理
              </Link>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none relative"
            aria-label="通知"
          >
            <FiBell className="h-5 w-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 transform translate-x-1/4 -translate-y-1/4"></span>
          </button>
          
          <div className="relative">
            <button
              onClick={toggleProfileMenu}
              className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 focus:outline-none"
              aria-label="用户菜单"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser />}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.name || '用户'}
              </span>
            </button>
            
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                
                <Link 
                  href="/profile" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <FiUser className="mr-2" />
                    个人资料
                  </div>
                </Link>
                
                <button 
                  onClick={handleLogout} 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <FiLogOut className="mr-2" />
                    退出登录
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 
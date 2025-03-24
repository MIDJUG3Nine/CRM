"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';
import { FiMenu, FiX, FiHome, FiUsers, FiCheckSquare, FiPhone, FiBarChart2, FiUser, FiLogOut } from 'react-icons/fi';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  userId: string;
}

const ProfileMenu = ({ user }: { user: User | null }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
        aria-label="用户菜单"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
          {user.name?.charAt(0) || 'U'}
        </div>
        <span className="text-gray-700 hidden md:inline">{user.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-500">
              {user.role === 'ADMIN' ? '管理员' : 
               user.role === 'SALES' ? '销售员' : 
               user.role === 'DESIGNER' ? '设计师' : 
               user.role === 'PROJECT_MANAGER' ? '项目经理' : 
               user.role === 'SHAREHOLDER' ? '股东' : user.role}
            </p>
          </div>
          <div className="p-2">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="block w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              个人资料
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // 退出登录处理函数
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  useEffect(() => {
    // Fetch user data
    const fetchUser = async () => {
      try {
        console.log('Fetching user data from /api/auth/user...');
        const res = await fetch('/api/auth/user');
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error('Authentication error:', errorData);
          throw new Error(errorData.error || `Authentication failed with status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('User data received:', data);
        
        if (!data.user) {
          throw new Error('No user data found in response');
        }
        
        setUser(data.user);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);
  
  // 监听路由变化，关闭移动菜单
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-700">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-700 mb-2">错误</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">正在重定向到登录页面...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-yellow-50 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-yellow-700 mb-2">访问被拒绝</h2>
          <p className="text-gray-600 mb-4">您需要登录才能访问此页面。</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: '仪表盘', href: '/dashboard', icon: <FiHome className="w-5 h-5" />, roles: ['SALES', 'DESIGNER', 'PROJECT_MANAGER', 'SHAREHOLDER', 'ADMIN'] },
    { name: '客户管理', href: '/dashboard/customers', icon: <FiUsers className="w-5 h-5" />, roles: ['SALES', 'PROJECT_MANAGER', 'ADMIN'] },
    { name: '任务管理', href: '/dashboard/tasks', icon: <FiCheckSquare className="w-5 h-5" />, roles: ['SALES', 'DESIGNER', 'PROJECT_MANAGER', 'ADMIN'] },
    { name: '联系记录', href: '/dashboard/contacts', icon: <FiPhone className="w-5 h-5" />, roles: ['SALES', 'DESIGNER', 'PROJECT_MANAGER', 'ADMIN'] },
    { name: '报表分析', href: '/dashboard/reports', icon: <FiBarChart2 className="w-5 h-5" />, roles: ['PROJECT_MANAGER', 'SHAREHOLDER', 'ADMIN'] },
    { name: '用户管理', href: '/dashboard/users', icon: <FiUser className="w-5 h-5" />, roles: ['ADMIN'] },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user.role)
  );
  
  // 获取当前页面标题
  const currentPageTitle = filteredMenuItems.find(item => item.href === pathname)?.name || '仪表盘';

  return (
    <div className="flex flex-col h-screen bg-gray-100 md:flex-row">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm md:hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label={isMobileMenuOpen ? "关闭菜单" : "打开菜单"}
            >
              {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
            <h1 className="ml-3 text-lg font-semibold text-gray-800">CRM系统</h1>
          </div>
          <div className="flex items-center space-x-3">
            <NotificationCenter userId={user?.userId || ''} />
            <ProfileMenu user={user} />
          </div>
        </div>
      </header>

      {/* Sidebar - Mobile (overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-80 max-w-[80%] h-full bg-white overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">CRM系统</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
                aria-label="关闭菜单"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    {user.role === 'ADMIN' ? '管理员' : 
                     user.role === 'SALES' ? '销售员' : 
                     user.role === 'DESIGNER' ? '设计师' : 
                     user.role === 'PROJECT_MANAGER' ? '项目经理' : 
                     user.role === 'SHAREHOLDER' ? '股东' : user.role}
                  </p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {filteredMenuItems.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center p-3 rounded-md text-gray-700 hover:bg-gray-100 ${
                        pathname === item.href ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full p-3 rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    <FiLogOut className="w-5 h-5 mr-3" />
                    退出登录
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop (fixed) */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0 bg-white shadow-md">
        <div className="p-4 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">CRM系统</h2>
        </div>
        <div className="p-4 border-b">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user.name}</p>
              <p className="text-xs text-gray-500">
                {user.role === 'ADMIN' ? '管理员' : 
                 user.role === 'SALES' ? '销售员' : 
                 user.role === 'DESIGNER' ? '设计师' : 
                 user.role === 'PROJECT_MANAGER' ? '项目经理' : 
                 user.role === 'SHAREHOLDER' ? '股东' : user.role}
              </p>
            </div>
          </div>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {filteredMenuItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center p-2 rounded-md text-gray-700 hover:bg-gray-100 ${
                    pathname === item.href ? 'bg-gray-100 font-medium' : ''
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center w-full p-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                <FiLogOut className="w-5 h-5 mr-3" />
                退出登录
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Desktop Header */}
        <header className="hidden md:block bg-white shadow-sm">
          <div className="py-4 px-6">
            <div className="flex justify-end mb-4">
              <div className="flex items-center space-x-4">
                <NotificationCenter userId={user?.userId || ''} />
                <ProfileMenu user={user} />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">{currentPageTitle}</h1>
          </div>
        </header>
        
        {/* Mobile Page Title */}
        <div className="md:hidden px-4 py-2 bg-white border-b">
          <h1 className="text-lg font-medium text-gray-800">{currentPageTitle}</h1>
        </div>
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
} 
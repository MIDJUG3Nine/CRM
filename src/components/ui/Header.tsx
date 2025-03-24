import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMenu, FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import { toast } from '@/components/ui/Notifications';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const router = useRouter();

  const handleLogout = () => {
    // 清除localStorage中的token
    localStorage.removeItem('auth_token');
    
    // 清除cookie中的token
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // 显示登出成功通知
    toast.success({
      title: '登出成功',
      message: '您已成功登出系统'
    });
    
    // 重定向到登录页
    router.replace('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center">
        <button
          className="text-gray-600 focus:outline-none focus:text-gray-800 mr-4"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <FiMenu size={24} />
        </button>
        <Link href="/dashboard" className="text-xl font-semibold text-gray-800">
          CRM3 系统
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        <button className="text-gray-600 hover:text-gray-800 focus:outline-none">
          <FiBell size={20} />
        </button>
        <Link href="/profile" className="text-gray-600 hover:text-gray-800 focus:outline-none">
          <FiUser size={20} />
        </Link>
        <button 
          className="text-gray-600 hover:text-gray-800 focus:outline-none"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <FiLogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header; 
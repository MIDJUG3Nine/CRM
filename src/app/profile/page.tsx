'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiUser, FiMail, FiLock, FiSettings } from 'react-icons/fi';
import { LoadingState, PageTransition } from '@/components/ui/LoadingState';
import { ApiErrorState } from '@/components/ui/ErrorState';
import { toast } from '@/components/ui/Notifications';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
}

interface ProfileFormData {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // 获取当前用户信息
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch('/api/auth/user');
        
        if (!res.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const data = await res.json();
        
        if (!data.user) {
          throw new Error('User not found');
        }
        
        setUser(data.user);
        setFormData(prev => ({
          ...prev,
          name: data.user.name || '',
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        toast.error({
          title: '获取用户信息失败',
          message: err instanceof Error ? err.message : '加载用户信息时发生错误',
        });
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    };
    
    fetchUserProfile();
  }, [isRetrying]);
  
  // 处理字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // 验证表单
      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        throw new Error('新密码和确认密码不一致');
      }
      
      // 仅发送需要更新的字段
      const updateData: Record<string, string> = {};
      
      if (formData.name !== user?.name) {
        updateData.name = formData.name;
      }
      
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          throw new Error('请输入当前密码');
        }
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      // 如果没有更新字段，则直接返回
      if (Object.keys(updateData).length === 0) {
        toast.info({
          title: '未修改',
          message: '没有字段被修改',
          duration: 3000,
        });
        setSaving(false);
        return;
      }
      
      // 发送更新请求
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '更新个人资料失败');
      }
      
      // 重置密码字段
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
      toast.success({
        title: '更新成功',
        message: '个人资料已成功更新',
        duration: 3000,
      });
      
      // 刷新用户数据
      const userData = await res.json();
      if (userData.user) {
        setUser(userData.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error({
        title: '更新失败',
        message: err instanceof Error ? err.message : '更新个人资料时发生错误',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleRetry = () => {
    setIsRetrying(true);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingState size="lg" text="加载用户信息..." />
      </div>
    );
  }
  
  if (error && !user) {
    return (
      <ApiErrorState
        title="加载用户信息错误"
        message={error}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }
  
  const getRoleName = (role: string) => {
    switch (role) {
      case 'ADMIN': return '管理员';
      case 'SALES': return '销售员';
      case 'DESIGNER': return '设计师';
      case 'PROJECT_MANAGER': return '项目经理';
      case 'SHAREHOLDER': return '股东';
      default: return role;
    }
  };
  
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <FiArrowLeft className="mr-2" /> 返回仪表盘
          </Link>
          <h1 className="text-2xl font-bold mt-2">个人资料</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <FiUser size={32} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user?.name}</h2>
                <p className="text-gray-600 flex items-center">
                  <FiMail className="mr-2" /> {user?.email}
                </p>
                <p className="text-gray-600 mt-1">
                  角色: <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {user ? getRoleName(user.role) : ''}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <FiSettings className="mr-2" /> 账户设置
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 基本信息 */}
                <div>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      姓名
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      邮箱
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">邮箱不可修改</p>
                  </div>
                </div>
                
                {/* 密码修改 */}
                <div>
                  <div className="mb-4">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      当前密码
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      新密码
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      确认新密码
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                      保存中...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-2" />
                      保存
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  );
} 
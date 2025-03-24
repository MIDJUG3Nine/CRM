'use client';

import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { LoadingState, PageTransition } from '@/components/ui/LoadingState';
import { ApiErrorState } from '@/components/ui/ErrorState';
import { toast } from '@/components/ui/Notifications';
import { t } from '@/lib/i18n';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  createdAt?: string;
}

// Constants
const PAGE_SIZE = 10;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    isApproved: null,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Build query params
        const params = new URLSearchParams();
        if (filters.role) params.append('role', filters.role);
        if (filters.isApproved !== null) params.append('isApproved', String(filters.isApproved));
        if (searchTerm) params.append('search', searchTerm);
        params.append('page', String(currentPage));
        params.append('pageSize', String(PAGE_SIZE));
        
        // Send request
        const response = await fetch(`/api/users?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("User data received:", data);
        
        // Check data structure
        if (!data.users || !Array.isArray(data.users)) {
          console.error('Invalid response format:', data);
          setUsers([]);
          setTotalItems(0);
        } else {
          setUsers(data.users);
          setTotalItems(data.pagination?.total || 0);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, searchTerm, filters]);

  const handleApprove = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '操作失败');
      }
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isApproved: true } : user
      ));
      
      toast.success({
        title: '操作成功',
        message: '用户已批准',
        duration: 3000
      });
    } catch (err: any) {
      toast.error({
        title: '操作失败',
        message: err.message || '批准用户时发生错误',
      });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/reject`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '操作失败');
      }
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isApproved: false } : user
      ));
      
      toast.success({
        title: '操作成功',
        message: '用户已拒绝',
        duration: 3000
      });
    } catch (err: any) {
      toast.error({
        title: '操作失败',
        message: err.message || '拒绝用户时发生错误',
      });
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setError(''); // 清除错误状态
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingState size="lg" text="加载用户列表..." />
      </div>
    );
  }

  if (error) {
    return (
      <ApiErrorState
        title="加载用户列表错误"
        message={error}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-8">用户管理</h1>
        
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  邮箱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getRoleName(user.role)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isApproved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.isApproved ? '已批准' : '待批准'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {!user.isApproved && (
                          <button 
                            onClick={() => handleApprove(user.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <FiCheck className="h-5 w-5" />
                          </button>
                        )}
                        {user.isApproved && (
                          <button
                            onClick={() => handleReject(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiX className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    暂无用户数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
} 
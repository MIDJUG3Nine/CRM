'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import { LoadingState, PageTransition } from '@/components/ui/LoadingState';
import { ApiErrorState } from '@/components/ui/ErrorState';
import { toast } from '@/components/ui/Notifications';
import { t } from '@/lib/i18n';

interface Contact {
  id: string;
  date: string;
  method: string;
  notes: string;
  customerId: string;
  customer: {
    name: string;
    id: string;
  };
  userId: string;
  user: {
    name: string;
  };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/contacts');
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '获取联系记录失败');
        }
        
        const data = await res.json();
        
        // 确保返回的是数组或者有contacts属性
        if (data && typeof data === 'object') {
          // 如果直接返回数组
          if (Array.isArray(data)) {
            setContacts(data);
          } 
          // 如果返回包含contacts属性的对象
          else if (data.contacts && Array.isArray(data.contacts)) {
            setContacts(data.contacts);
          } 
          // 空数据情况
          else if (data.contacts === null || data.contacts === undefined) {
            setContacts([]);
          }
          // 无效格式
          else {
            console.warn('API返回了意外的数据格式:', data);
            setContacts([]);
          }
          setError('');
        } else {
          throw new Error('无效的数据格式');
        }
      } catch (err: any) {
        console.error('联系记录获取错误:', err);
        setError(err.message || '加载联系记录时发生错误');
        toast.error({
          title: '加载失败',
          message: err.message || '加载联系记录时发生错误',
        });
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    };

    fetchContacts();
  }, [isRetrying]); // 添加isRetrying依赖，使重试功能生效

  const handleRetry = () => {
    setIsRetrying(true);
    setError(''); // 清除错误状态
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'EMAIL': return '邮件';
      case 'PHONE': return '电话';
      case 'MEETING': return '会议';
      case 'OTHER': return '其他';
      default: return method;
    }
  };

  // 根据搜索条件过滤联系记录
  const filteredContacts = searchTerm
    ? contacts.filter(
        contact =>
          contact.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.notes.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : contacts;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingState size="lg" text="加载联系记录..." />
      </div>
    );
  }

  if (error) {
    return (
      <ApiErrorState
        title="加载联系记录错误"
        message={error}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">联系记录</h1>
          <Link
            href="/dashboard/contacts/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center"
          >
            <FiPlus className="mr-2" />
            添加联系记录
          </Link>
        </div>
        
        {/* 搜索框 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="搜索客户名称或备注..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="ml-3 p-2 rounded-md text-gray-500 hover:bg-gray-100">
              <FiFilter />
            </button>
          </div>
        </div>
        
        {/* 联系记录列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredContacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      客户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日期
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      方式
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      备注
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      记录人
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/customers/${contact.customer.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {contact.customer.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(contact.date).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getMethodName(contact.method)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="truncate max-w-xs" title={contact.notes}>
                          {contact.notes}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {contact.user?.name || '未知'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              {searchTerm ? '没有找到匹配的联系记录' : '暂无联系记录'}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
} 
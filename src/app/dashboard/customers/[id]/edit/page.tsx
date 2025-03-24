'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

// 定义客户数据类型
interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  industry: string;
  status: string;
  requirements: string | null;
  salespersonId: string | null;
}

// 定义用户数据类型
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const CustomerEditPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  // 使用React.use解包params
  const customerId = use(Promise.resolve(params.id));
  
  // 表单状态
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    industry: 'TECHNOLOGY',
    status: 'LEAD',
    requirements: '',
    salespersonId: '',
  });
  
  const [salespeople, setSalespeople] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 获取客户数据和销售人员列表
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 并行获取客户数据和销售人员列表
        const [customerResponse, usersResponse] = await Promise.all([
          fetch(`/api/customers/${customerId}`),
          fetch('/api/users?role=SALES'),
        ]);
        
        if (!customerResponse.ok) {
          throw new Error('Failed to fetch customer data');
        }
        
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch sales users');
        }
        
        const customerData = await customerResponse.json();
        const usersData = await usersResponse.json();
        
        setFormData(customerData);
        
        // 过滤出销售角色的用户
        const salesUsers = usersData.users && Array.isArray(usersData.users) 
          ? usersData.users.filter((user: User) => 
              user.role === 'SALES' || user.role === 'MANAGER'
            )
          : [];
        setSalespeople(salesUsers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [customerId]);
  
  // 处理表单字段变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? null : value,
    }));
  };
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update customer');
      }
      
      // 成功更新后返回客户详情页
      router.push(`/dashboard/customers/${customerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-gray-500">Loading customer data...</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/dashboard/customers/${customerId}`}
          className="text-blue-600 hover:text-blue-900 flex items-center"
        >
          <FiArrowLeft className="mr-2" /> Back to customer
        </Link>
        <h1 className="text-2xl font-bold mt-4">Edit Customer</h1>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 基本信息 */}
            <div>
              <h2 className="text-lg font-medium mb-4">Basic Information</h2>
              
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* 业务信息 */}
            <div>
              <h2 className="text-lg font-medium mb-4">Business Information</h2>
              
              <div className="mb-4">
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={formData.industry || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="TECHNOLOGY">Technology</option>
                  <option value="HEALTHCARE">Healthcare</option>
                  <option value="FINANCE">Finance</option>
                  <option value="EDUCATION">Education</option>
                  <option value="MANUFACTURING">Manufacturing</option>
                  <option value="RETAIL">Retail</option>
                  <option value="FOOD">Food & Beverage</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="salespersonId" className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Salesperson
                </label>
                <select
                  id="salespersonId"
                  name="salespersonId"
                  value={formData.salespersonId || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  {salespeople.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements / Notes
                </label>
                <textarea
                  id="requirements"
                  name="requirements"
                  rows={4}
                  value={formData.requirements || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-end">
            <Link
              href={`/dashboard/customers/${customerId}`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md mr-4 hover:bg-gray-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <FiSave className="mr-2" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerEditPage; 
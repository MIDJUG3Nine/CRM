'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiPlus, FiSearch, FiFilter, FiEye, FiEdit, FiTrash2, FiPhone, FiMail } from 'react-icons/fi';

// 定义客户数据类型
interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  industry: string;
  status: string;
  salesperson: {
    id: string;
    name: string;
  } | null;
  _count: {
    contactLogs: number;
    tasks: number;
  };
}

// 定义分页数据类型
interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// 定义API响应数据类型
interface ApiResponse {
  data: Customer[];
  pagination: Pagination;
}

const CustomerList = () => {
  // 状态管理
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  });
  
  // 搜索和过滤状态
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const router = useRouter();

  // 获取客户列表
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (search) params.append('search', search);
      if (industry) params.append('industry', industry);
      if (status) params.append('status', status);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/customers?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      
      const data: ApiResponse = await response.json();
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和搜索/过滤/排序/分页更改时获取数据
  useEffect(() => {
    fetchCustomers();
  }, [pagination.page, search, industry, status, sortBy, sortOrder]);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 }); // 重置到第一页
  };

  // 处理排序
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // 如果已经在排序这一列，切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 否则，按新列排序
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // 处理删除客户
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        const response = await fetch(`/api/customers/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete customer');
        }
        
        // 重新获取客户列表
        fetchCustomers();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete customer');
      }
    }
  };

  // 渲染状态徽章
  const renderStatusBadge = (status: string) => {
    let bgColor = '';
    switch (status) {
      case 'LEAD':
        bgColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'ACTIVE':
        bgColor = 'bg-green-100 text-green-800';
        break;
      case 'INACTIVE':
        bgColor = 'bg-gray-100 text-gray-800';
        break;
      default:
        bgColor = 'bg-blue-100 text-blue-800';
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
        {status.toLowerCase()}
      </span>
    );
  };

  // 渲染行业徽章
  const renderIndustryBadge = (industry: string) => {
    let bgColor = '';
    switch (industry) {
      case 'TECHNOLOGY':
        bgColor = 'bg-purple-100 text-purple-800';
        break;
      case 'MANUFACTURING':
        bgColor = 'bg-blue-100 text-blue-800';
        break;
      case 'HEALTHCARE':
        bgColor = 'bg-green-100 text-green-800';
        break;
      case 'FINANCE':
        bgColor = 'bg-yellow-100 text-yellow-800';
        break;
      case 'FOOD':
        bgColor = 'bg-red-100 text-red-800';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
        {industry.toLowerCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        
        <Link 
          href="/dashboard/customers/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FiPlus className="mr-2" /> Add Customer
        </Link>
      </div>
      
      {/* 搜索和过滤 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full p-2 pl-10 text-sm border border-gray-300 rounded-lg"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full md:w-auto">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" />
              <select
                className="p-2 text-sm border border-gray-300 rounded-lg"
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                <option value="">All Industries</option>
                <option value="TECHNOLOGY">Technology</option>
                <option value="MANUFACTURING">Manufacturing</option>
                <option value="HEALTHCARE">Healthcare</option>
                <option value="FINANCE">Finance</option>
                <option value="FOOD">Food</option>
                <option value="OTHER">Other</option>
              </select>
              
              <select
                className="p-2 text-sm border border-gray-300 rounded-lg"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                <option value="">All Statuses</option>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Search
          </button>
        </form>
      </div>
      
      {/* 错误显示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* 客户列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-4 text-center">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-4 text-center">
            No customers found. Try adjusting your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('industry')}
                  >
                    Industry {sortBy === 'industry' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salesperson
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        {customer.email && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <FiMail className="mr-1" />
                            <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                              {customer.email}
                            </a>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <FiPhone className="mr-1" />
                            <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                              {customer.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderIndustryBadge(customer.industry)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(customer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <div>{customer._count.contactLogs} contacts</div>
                        <div>{customer._count.tasks} tasks</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {customer.salesperson ? customer.salesperson.name : 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEye className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/dashboard/customers/${customer.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                        >
                          <FiEdit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* 分页控件 */}
        {!loading && customers.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} customers
            </div>
            <div className="flex space-x-2">
              <button
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList; 
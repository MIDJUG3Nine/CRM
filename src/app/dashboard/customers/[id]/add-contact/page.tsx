'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

// 定义联系方式类型
type ContactMethod = 'EMAIL' | 'PHONE' | 'MEETING' | 'VIDEO_CALL' | 'OTHER';

const AddContactPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const customerId = params.id;
  
  // 表单状态
  const [formData, setFormData] = useState({
    method: 'EMAIL' as ContactMethod,
    content: '',
    feedback: '',
    followUpPlan: '',
  });
  
  // 加载状态和错误状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  
  // 获取客户名称
  useEffect(() => {
    const fetchCustomerName = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch customer');
        }
        const data = await response.json();
        setCustomerName(data.name);
      } catch (err) {
        setError('Could not load customer details');
      }
    };
    
    fetchCustomerName();
  }, [customerId]);
  
  // 处理表单变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const contactData = {
        ...formData,
        customerId,
        date: new Date().toISOString(),
      };
      
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create contact record');
      }
      
      // 创建成功，返回客户详情页
      router.push(`/dashboard/customers/${customerId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/dashboard/customers/${customerId}`}
          className="text-blue-600 hover:text-blue-900 flex items-center"
        >
          <FiArrowLeft className="mr-2" /> Back to {customerName || 'customer'}
        </Link>
        <h1 className="text-2xl font-bold mt-4">Record New Interaction</h1>
        <p className="text-gray-600">
          {customerName ? `Record a new interaction with ${customerName}` : 'Record a new customer interaction'}
        </p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-2">
              Contact Method *
            </label>
            <select
              id="method"
              name="method"
              value={formData.method}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone Call</option>
              <option value="MEETING">In-person Meeting</option>
              <option value="VIDEO_CALL">Video Call</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Interaction Content *
            </label>
            <textarea
              id="content"
              name="content"
              rows={4}
              value={formData.content}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="What was discussed in this interaction?"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Feedback
            </label>
            <textarea
              id="feedback"
              name="feedback"
              rows={3}
              value={formData.feedback}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="What feedback did the customer provide?"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="followUpPlan" className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Plan
            </label>
            <textarea
              id="followUpPlan"
              name="followUpPlan"
              rows={3}
              value={formData.followUpPlan}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="What are the next steps or follow-up actions?"
            />
          </div>
          
          <div className="flex items-center justify-end">
            <Link
              href={`/dashboard/customers/${customerId}`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md mr-4 hover:bg-gray-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <FiSave className="mr-2" /> Save Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactPage; 
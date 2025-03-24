"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoadingState, PageTransition } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/StatusDisplays';
import { toast } from '@/components/ui/Notifications';

interface Contact {
  id: string;
  date: string;
  method: string;
  customer: {
    id: string;
    name: string;
  };
}

interface DashboardStats {
  totalCustomers: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  recentContacts: Contact[];
}

const defaultStats: DashboardStats = {
  totalCustomers: 0,
  totalTasks: 0,
  pendingTasks: 0,
  completedTasks: 0,
  recentContacts: [],
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dashboard/stats');
        
        if (!res.ok) {
          console.error(`Dashboard API error: ${res.status}`);
          throw new Error('Failed to load dashboard data');
        }
        
        const data = await res.json();
        console.log("Dashboard data received:", data);
        
        if (data && data.stats) {
          setStats(data.stats);
        } else {
          console.error('Invalid dashboard data format:', data);
          throw new Error('Invalid dashboard data format');
        }
        
        setError('');
        
        // 显示成功消息
        toast.success({
          title: 'Data Updated',
          message: 'Dashboard data has been successfully loaded',
          duration: 3000
        });
      } catch (err: any) {
        console.error('Dashboard stats error:', err);
        setError(err.message || 'Error loading dashboard statistics');
        
        // 显示错误消息
        toast.error({
          title: 'Loading Failed',
          message: err.message || 'Error loading dashboard statistics',
        });
        
        // Auto-retry logic (max 3 attempts)
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 3000);
        }
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    };

    fetchDashboardStats();
  }, [retryCount]);

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingState size="lg" text="Loading dashboard statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Dashboard Loading Error"
        message={error}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  return (
    <PageTransition>
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Summary Cards */}
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center card-hover-effect">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <span className="text-blue-600 text-xl">👥</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Customers</p>
              <h3 className="text-2xl font-bold">{stats.totalCustomers}</h3>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 flex items-center card-hover-effect">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Tasks</p>
              <h3 className="text-2xl font-bold">{stats.totalTasks}</h3>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 flex items-center card-hover-effect">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <span className="text-yellow-600 text-xl">⏰</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Pending Tasks</p>
              <h3 className="text-2xl font-bold">{stats.pendingTasks}</h3>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 flex items-center card-hover-effect">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <span className="text-purple-600 text-xl">✅</span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Completed Tasks</p>
              <h3 className="text-2xl font-bold">{stats.completedTasks}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Contacts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Contacts</h2>
              <Link href="/dashboard/contacts" className="text-blue-600 hover:text-blue-800 text-sm">
                View All
              </Link>
            </div>
            {stats.recentContacts && stats.recentContacts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.recentContacts.map((contact) => (
                      <tr key={contact.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {contact.customer?.name || 'Unknown Customer'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {new Date(contact.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {contact.method}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent contacts</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/dashboard/customers/new"
                className="bg-indigo-50 hover:bg-indigo-100 p-4 rounded-lg flex flex-col items-center justify-center text-center transition-colors button-press-effect"
              >
                <span className="text-2xl mb-2">➕</span>
                <span className="text-indigo-700 font-medium">Add Customer</span>
              </Link>
              <Link
                href="/dashboard/tasks/new"
                className="bg-green-50 hover:bg-green-100 p-4 rounded-lg flex flex-col items-center justify-center text-center transition-colors button-press-effect"
              >
                <span className="text-2xl mb-2">✓</span>
                <span className="text-green-700 font-medium">Create Task</span>
              </Link>
              <Link
                href="/dashboard/contacts/new"
                className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex flex-col items-center justify-center text-center transition-colors button-press-effect"
              >
                <span className="text-2xl mb-2">📞</span>
                <span className="text-blue-700 font-medium">Record Contact</span>
              </Link>
              <Link
                href="/dashboard/reports"
                className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg flex flex-col items-center justify-center text-center transition-colors button-press-effect"
              >
                <span className="text-2xl mb-2">📊</span>
                <span className="text-purple-700 font-medium">View Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiAlertCircle, FiCheckCircle, FiSave } from 'react-icons/fi';
import UserLayout from '@/components/layouts/UserLayout';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskAssigned: boolean;
  taskStatusChanged: boolean;
  taskDueSoon: boolean;
  taskOverdue: boolean;
  taskCommentAdded: boolean;
  customerAdded: boolean;
  customerUpdated: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    taskAssigned: true,
    taskStatusChanged: true,
    taskDueSoon: true,
    taskOverdue: true,
    taskCommentAdded: true,
    customerAdded: true,
    customerUpdated: true,
    dailySummary: false,
    weeklySummary: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  
  // 加载用户的通知设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axios.get('/api/user/notification-settings');
        if (response.data.success) {
          setSettings(response.data.data);
        } else {
          setError('无法加载通知设置');
        }
      } catch (err) {
        console.error('加载通知设置失败:', err);
        setError('加载通知设置时出错');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // 处理设置变更
  const handleChange = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // 清除成功或错误消息
    setSuccess(false);
    setError(null);
  };
  
  // 保存设置
  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);
    
    try {
      const response = await axios.post('/api/user/notification-settings', settings);
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.data.error || '保存设置失败');
      }
    } catch (err) {
      console.error('保存通知设置失败:', err);
      setError('保存设置时出错');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <UserLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">加载设置...</span>
        </div>
      </UserLayout>
    );
  }
  
  return (
    <UserLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">通知设置</h1>
          <p className="text-gray-600">自定义您想要接收的通知类型</p>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 p-4 rounded-md flex items-start">
            <FiAlertCircle className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 p-4 rounded-md flex items-start">
            <FiCheckCircle className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-green-800">设置已成功保存</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">通知渠道</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">电子邮件通知</label>
                <p className="text-sm text-gray-500">通过电子邮件接收通知</p>
              </div>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.emailNotifications}
                    onChange={() => handleChange('emailNotifications')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">浏览器推送通知</label>
                <p className="text-sm text-gray-500">在浏览器中接收实时推送通知</p>
              </div>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.pushNotifications}
                    onChange={() => handleChange('pushNotifications')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">任务通知</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">任务分配通知</label>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.taskAssigned}
                    onChange={() => handleChange('taskAssigned')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">任务状态变更通知</label>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.taskStatusChanged}
                    onChange={() => handleChange('taskStatusChanged')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">任务即将到期通知</label>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.taskDueSoon}
                    onChange={() => handleChange('taskDueSoon')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">任务逾期通知</label>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.taskOverdue}
                    onChange={() => handleChange('taskOverdue')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">任务评论通知</label>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.taskCommentAdded}
                    onChange={() => handleChange('taskCommentAdded')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">客户通知</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">新客户添加通知</label>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.customerAdded}
                    onChange={() => handleChange('customerAdded')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-700">客户信息更新通知</label>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.customerUpdated}
                    onChange={() => handleChange('customerUpdated')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">摘要通知</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">每日摘要</label>
                <p className="text-sm text-gray-500">每天接收任务和活动摘要</p>
              </div>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.dailySummary}
                    onChange={() => handleChange('dailySummary')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700">每周摘要</label>
                <p className="text-sm text-gray-500">每周接收任务和活动摘要</p>
              </div>
              <div className="ml-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.weeklySummary}
                    onChange={() => handleChange('weeklySummary')}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                保存设置
              </>
            )}
          </button>
        </div>
      </div>
    </UserLayout>
  );
} 
'use client';

import React, { useState } from 'react';
import { PageTransition, LoadingButton, LoadingState } from '@/components/ui/LoadingState';
import {
  Input,
  Select,
  TextArea,
  Checkbox,
  RadioGroup,
  FormDivider,
} from '@/components/ui/FormElements';
import {
  EmptyState,
  NoData,
  NoSearchResults,
  ErrorState,
  NetworkError,
  ServerError,
} from '@/components/ui/StatusDisplays';
import { toast } from '@/components/ui/Notifications';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function UIExamplesPage() {
  // 表单状态
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
    description: '',
    category: '',
    remember: false,
    priority: 'medium',
  });
  
  const [formTouched, setFormTouched] = useState({
    email: false,
    password: false,
    description: false,
    category: false,
    remember: false,
    priority: false,
  });
  
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
    description: '',
    category: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 处理表单值变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
    
    setFormTouched({
      ...formTouched,
      [name]: true,
    });
    
    // 简单验证
    if (name === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
      setFormErrors({
        ...formErrors,
        email: '请输入有效的邮箱地址',
      });
    } else if (name === 'password' && value && value.length < 6) {
      setFormErrors({
        ...formErrors,
        password: '密码长度至少为6个字符',
      });
    } else if (name === 'category' && !value) {
      setFormErrors({
        ...formErrors,
        category: '请选择一个类别',
      });
    } else {
      setFormErrors({
        ...formErrors,
        [name]: '',
      });
    }
  };
  
  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 设置所有字段为已触摸
    const allTouched = Object.keys(formTouched).reduce((acc, key) => {
      acc[key as keyof typeof formTouched] = true;
      return acc;
    }, {} as typeof formTouched);
    
    setFormTouched(allTouched);
    
    // 验证
    let hasError = false;
    const newErrors = { ...formErrors };
    
    if (!formValues.email) {
      newErrors.email = '邮箱不能为空';
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(formValues.email)) {
      newErrors.email = '请输入有效的邮箱地址';
      hasError = true;
    }
    
    if (!formValues.password) {
      newErrors.password = '密码不能为空';
      hasError = true;
    } else if (formValues.password.length < 6) {
      newErrors.password = '密码长度至少为6个字符';
      hasError = true;
    }
    
    if (!formValues.category) {
      newErrors.category = '请选择一个类别';
      hasError = true;
    }
    
    setFormErrors(newErrors);
    
    if (!hasError) {
      // 模拟提交
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        toast.success({
          title: '提交成功',
          message: '表单数据已成功提交',
          duration: 5000,
        });
      }, 2000);
    } else {
      toast.error({
        title: '表单验证失败',
        message: '请检查表单中的错误并重试',
      });
    }
  };
  
  // 显示不同类型的通知
  const showNotifications = () => {
    toast.success({ title: '操作成功', message: '数据已成功保存' });
    
    setTimeout(() => {
      toast.error({ title: '发生错误', message: '无法连接到服务器' });
    }, 1000);
    
    setTimeout(() => {
      toast.warning({ title: '注意', message: '您的账户即将过期' });
    }, 2000);
    
    setTimeout(() => {
      toast.info({ title: '提示信息', message: '新版本已经可用' });
    }, 3000);
  };
  
  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 pb-4 border-b">UI 组件展示</h1>
        
        {/* 加载状态和按钮 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">加载状态和按钮</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 border rounded-lg bg-white">
              <h3 className="text-lg font-medium mb-4">加载指示器</h3>
              <div className="flex space-x-8">
                <div>
                  <p className="mb-2 text-sm text-gray-500">小尺寸</p>
                  <LoadingState size="sm" text="" />
                </div>
                <div>
                  <p className="mb-2 text-sm text-gray-500">中尺寸</p>
                  <LoadingState size="md" text="" />
                </div>
                <div>
                  <p className="mb-2 text-sm text-gray-500">大尺寸</p>
                  <LoadingState size="lg" text="" />
                </div>
              </div>
            </div>
            
            <div className="p-6 border rounded-lg bg-white">
              <h3 className="text-lg font-medium mb-4">加载按钮</h3>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <LoadingButton
                    isLoading={isLoading}
                    className="bg-blue-500 text-white"
                    onClick={() => {
                      setIsLoading(true);
                      setTimeout(() => setIsLoading(false), 2000);
                    }}
                  >
                    提交
                  </LoadingButton>
                  
                  <LoadingButton
                    isLoading={isLoading}
                    className="bg-green-500 text-white"
                    loadingText="保存中"
                    onClick={() => {
                      setIsLoading(true);
                      setTimeout(() => setIsLoading(false), 2000);
                    }}
                  >
                    保存
                  </LoadingButton>
                </div>
                
                <div className="flex space-x-4">
                  <LoadingButton
                    isLoading={isLoading}
                    className="border border-gray-300 bg-white text-gray-700"
                    onClick={() => {
                      setIsLoading(true);
                      setTimeout(() => setIsLoading(false), 2000);
                    }}
                  >
                    取消
                  </LoadingButton>
                  
                  <LoadingButton
                    isLoading={isLoading}
                    className="bg-red-500 text-white"
                    loadingText="删除中"
                    onClick={() => {
                      setIsLoading(true);
                      setTimeout(() => setIsLoading(false), 2000);
                    }}
                  >
                    删除
                  </LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* 表单元素 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">表单元素</h2>
          <div className="bg-white border rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    name="email"
                    label="邮箱"
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={formValues.email}
                    onChange={handleChange}
                    error={formErrors.email}
                    touched={formTouched.email}
                    leftIcon={<FiMail />}
                    tip="我们不会公开您的邮箱"
                  />
                  
                  <div className="relative">
                    <Input
                      name="password"
                      label="密码"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={formValues.password}
                      onChange={handleChange}
                      error={formErrors.password}
                      touched={formTouched.password}
                      leftIcon={<FiLock />}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      }
                      tip="密码长度至少6个字符"
                    />
                  </div>
                  
                  <Select
                    name="category"
                    label="类别"
                    value={formValues.category}
                    onChange={handleChange}
                    error={formErrors.category}
                    touched={formTouched.category}
                  >
                    <option value="">请选择类别</option>
                    <option value="technology">科技</option>
                    <option value="finance">金融</option>
                    <option value="health">健康</option>
                    <option value="education">教育</option>
                  </Select>
                </div>
                
                <div>
                  <TextArea
                    name="description"
                    label="描述"
                    placeholder="请输入描述信息"
                    value={formValues.description}
                    onChange={handleChange}
                    rows={5}
                    error={formErrors.description}
                    touched={formTouched.description}
                  />
                  
                  <RadioGroup
                    label="优先级"
                    name="priority"
                    options={[
                      { value: 'low', label: '低' },
                      { value: 'medium', label: '中' },
                      { value: 'high', label: '高' },
                    ]}
                    value={formValues.priority}
                    onChange={handleChange}
                  />
                  
                  <Checkbox
                    name="remember"
                    label="记住我"
                    checked={formValues.remember as boolean}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <FormDivider label="操作" />
              
              <div className="flex justify-end space-x-4">
                <LoadingButton
                  type="button"
                  isLoading={false}
                  className="border border-gray-300 bg-white text-gray-700"
                >
                  取消
                </LoadingButton>
                
                <LoadingButton
                  type="submit"
                  isLoading={isLoading}
                  className="bg-blue-500 text-white"
                >
                  提交
                </LoadingButton>
              </div>
            </form>
          </div>
        </section>
        
        {/* 状态展示 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">状态展示</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-medium">空状态</h3>
              </div>
              <EmptyState
                title="暂无数据"
                message="您尚未创建任何内容，点击下方按钮开始创建。"
                action={{
                  label: "创建",
                  onClick: () => alert("点击创建按钮"),
                }}
              />
            </div>
            
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-medium">搜索结果为空</h3>
              </div>
              <NoSearchResults
                searchTerm="找不到的内容"
                onReset={() => setSearchTerm("")}
              />
            </div>
            
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-medium">错误状态</h3>
              </div>
              <ErrorState
                title="加载失败"
                message="无法加载数据，请检查网络连接后重试。"
                onRetry={() => alert("点击重试按钮")}
              />
            </div>
            
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-medium">网络错误</h3>
              </div>
              <NetworkError
                onRetry={() => alert("点击重试按钮")}
              />
            </div>
          </div>
        </section>
        
        {/* 通知 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">通知</h2>
          <div className="bg-white border rounded-lg p-6">
            <p className="mb-4">点击下方按钮显示不同类型的通知</p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={showNotifications}
            >
              显示通知
            </button>
          </div>
        </section>
      </div>
    </PageTransition>
  );
} 
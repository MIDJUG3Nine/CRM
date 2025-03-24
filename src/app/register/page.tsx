"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Select, FormDivider } from '@/components/ui/FormElements';
import { LoadingButton, PageTransition } from '@/components/ui/LoadingState';
import { toast } from '@/components/ui/Notifications';
import { FiUser, FiMail, FiLock, FiShield } from 'react-icons/fi';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('SALES');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formTouched, setFormTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    role: false
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 更新对应的状态
    if (name === 'name') setName(value);
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
    if (name === 'confirmPassword') setConfirmPassword(value);
    if (name === 'role') setRole(value);
    
    // 标记字段为已触摸
    setFormTouched({
      ...formTouched,
      [name]: true
    });
    
    // 实时验证
    validateField(name, value);
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch(name) {
      case 'name':
        if (!value) error = '请输入姓名';
        else if (value.length < 2) error = '姓名长度至少为2个字符';
        break;
      case 'email':
        if (!value) error = '请输入邮箱地址';
        else if (!/\S+@\S+\.\S+/.test(value)) error = '请输入有效的邮箱地址';
        break;
      case 'password':
        if (!value) error = '请输入密码';
        else if (value.length < 6) error = '密码长度至少为6个字符';
        break;
      case 'confirmPassword':
        if (!value) error = '请确认密码';
        else if (value !== password) error = '两次输入的密码不一致';
        break;
      case 'role':
        if (!value) error = '请选择角色';
        break;
    }
    
    setFormErrors({
      ...formErrors,
      [name]: error
    });
    
    return error;
  };

  const validateForm = () => {
    // 触摸所有字段
    const allTouched = {
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      role: true
    };
    setFormTouched(allTouched);
    
    // 验证所有字段
    const nameError = validateField('name', name);
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);
    const confirmPasswordError = validateField('confirmPassword', confirmPassword);
    const roleError = validateField('role', role);
    
    return !nameError && !emailError && !passwordError && !confirmPasswordError && !roleError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    if (!validateForm()) {
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '注册失败');
      }

      // 显示成功消息
      toast.success({
        title: '注册成功',
        message: '账户已创建，正在跳转到登录页...',
        duration: 3000
      });
      
      // 清空表单
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // 延迟跳转以显示成功消息
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      
      // 显示错误消息
      toast.error({
        title: '注册失败',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              创建您的账户
            </h2>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <Input
                name="name"
                label="姓名"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={handleChange}
                error={formErrors.name}
                touched={formTouched.name}
                leftIcon={<FiUser />}
                placeholder="请输入姓名"
              />
              
              <Input
                name="email"
                label="邮箱地址"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleChange}
                error={formErrors.email}
                touched={formTouched.email}
                leftIcon={<FiMail />}
                placeholder="请输入邮箱地址"
              />
              
              <Input
                name="password"
                label="密码"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={handleChange}
                error={formErrors.password}
                touched={formTouched.password}
                leftIcon={<FiLock />}
                placeholder="请输入密码"
                tip="密码长度至少为6个字符"
              />
              
              <Input
                name="confirmPassword"
                label="确认密码"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={handleChange}
                error={formErrors.confirmPassword}
                touched={formTouched.confirmPassword}
                leftIcon={<FiLock />}
                placeholder="请再次输入密码"
              />
              
              <Select
                name="role"
                label="角色"
                value={role}
                onChange={handleChange}
                error={formErrors.role}
                touched={formTouched.role}
              >
                <option value="SALES">销售员</option>
                <option value="DESIGNER">设计师</option>
                <option value="PROJECT_MANAGER">项目经理</option>
                <option value="SHAREHOLDER">股东</option>
              </Select>
            </div>

            <FormDivider />
            
            <div>
              <LoadingButton
                type="submit"
                isLoading={loading}
                loadingText="注册中..."
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                注册
              </LoadingButton>
            </div>

            <div className="text-sm text-center">
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                已有账户？立即登录
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PageTransition>
  );
} 
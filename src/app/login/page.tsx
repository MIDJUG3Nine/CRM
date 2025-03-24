"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/FormElements';
import { LoadingButton, PageTransition } from '@/components/ui/LoadingState';
import { toast } from '@/components/ui/Notifications';
import { FiMail, FiLock } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formTouched, setFormTouched] = useState({
    email: false,
    password: false
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
    
    setFormTouched({
      ...formTouched,
      [name]: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 触摸所有字段
    setFormTouched({
      email: true,
      password: true
    });
    
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '登录失败');
      }

      console.log('登录成功，准备跳转到:', redirect);
      
      // 解析token cookie并存储到localStorage
      const cookies = document.cookie.split(';').map(cookie => cookie.trim());
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1];
        localStorage.setItem('auth_token', token);
        console.log('将token存储到localStorage');
      }
      
      // 显示成功消息
      toast.success({
        title: '登录成功',
        message: '正在跳转到仪表盘...',
        duration: 2000
      });
      
      // 执行跳转，使用router.replace确保不会出现重复跳转
      // 延迟500ms确保cookie已经被设置
      setTimeout(() => {
        console.log('执行跳转到:', redirect);
        
        // 检查token cookie - 使用正确的token名称
        const cookies = document.cookie.split(';').map(cookie => cookie.trim());
        const authTokenExists = cookies.some(cookie => cookie.startsWith('auth_token='));
        console.log('Cookie状态检查 - auth_token存在:', authTokenExists);
        
        // 使用router.replace进行跳转，不保留历史记录
        router.replace(redirect);
      }, 500);
    } catch (err: any) {
      setError(err.message);
      
      // 显示错误消息
      toast.error({
        title: '登录失败',
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              登录您的账户
            </h2>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <Input
                name="email"
                label="邮箱地址"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleChange}
                error={!email && formTouched.email ? '请输入邮箱地址' : ''}
                touched={formTouched.email}
                leftIcon={<FiMail />}
                placeholder="请输入邮箱地址"
              />
              
              <Input
                name="password"
                label="密码"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={handleChange}
                error={!password && formTouched.password ? '请输入密码' : ''}
                touched={formTouched.password}
                leftIcon={<FiLock />}
                placeholder="请输入密码"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <LoadingButton
                type="submit"
                isLoading={loading}
                loadingText="登录中..."
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                登录
              </LoadingButton>
            </div>

            <div className="text-sm text-center">
              <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                没有账户？立即注册
              </Link>
            </div>
          </form>
        </div>
      </div>
    </PageTransition>
  );
} 
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/ui/LoadingState';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if the user is logged in
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard');
        } else {
          // User is not logged in, redirect to login
          router.push('/login');
        }
      } catch (error) {
        // Error occurred, redirect to login
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <LoadingState size="lg" text="加载CRM系统中..." />
      </div>
    </div>
  );
}

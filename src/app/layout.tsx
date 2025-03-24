import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import FeedbackButton from "@/components/ui/FeedbackButton";
import { NotificationsContainer } from "@/components/ui/Notifications";
import ClientInit from "@/client-init";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM3 客户关系管理系统",
  description: "现代化的客户关系管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 确定当前路径是否为登录或注册页
  const isAuthPage = (pathname: string) => {
    return pathname.includes('/login') || pathname.includes('/register');
  };

  // 将布局函数转换为客户端组件并使用usePathname
  const ClientLayout = ({ children }: { children: React.ReactNode }) => {
    'use client';
    const { pathname } = typeof window !== 'undefined' 
      ? { pathname: window.location.pathname } 
      : { pathname: '' };
    
    return (
      <html lang="zh-CN">
        <body className={inter.className}>
          <ClientInit />
          {children}
          <NotificationsContainer />
          {/* 只在非认证页面显示反馈按钮 */}
          {!isAuthPage(pathname) && <FeedbackButton />}
        </body>
      </html>
    );
  };

  return <ClientLayout>{children}</ClientLayout>;
}

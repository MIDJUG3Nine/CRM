'use client';

import { useState } from 'react';
import { PageTransition } from '@/components/ui/LoadingState';
import FeedbackForm, { FeedbackData } from '@/components/ui/FeedbackForm';
import { toast } from '@/components/ui/Notifications';

export default function FeedbackPage() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitFeedback = async (data: FeedbackData) => {
    setSubmitting(true);
    
    try {
      // 这里将连接到实际的API端点
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '提交反馈失败');
      }
      
      // 成功处理已在FeedbackForm内部完成
    } catch (error: any) {
      // 将错误传递回表单组件
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">用户反馈</h1>
          <p className="text-gray-600">
            我们非常重视您的意见和建议。通过下面的表单，您可以向我们报告问题、提出改进建议或分享您的使用体验。
          </p>
        </div>
        
        <FeedbackForm 
          onSubmit={handleSubmitFeedback}
          includeEmail={true}
          className="mb-8"
        />
        
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">其他联系方式</h2>
          <p className="mb-4">
            如果您需要更直接的帮助，也可以通过以下方式联系我们的客户支持团队：
          </p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <span className="font-medium mr-2">📧 邮箱：</span>
              <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                support@example.com
              </a>
            </li>
            <li className="flex items-center">
              <span className="font-medium mr-2">📞 电话：</span>
              <a href="tel:+8610123456789" className="text-blue-600 hover:underline">
                +86 (10) 1234-5678
              </a>
            </li>
            <li className="flex items-center">
              <span className="font-medium mr-2">⏰ 工作时间：</span>
              <span>周一至周五 9:00 - 18:00</span>
            </li>
          </ul>
        </div>
      </div>
    </PageTransition>
  );
} 
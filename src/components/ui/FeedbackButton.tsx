'use client';

import React from 'react';
import Link from 'next/link';
import { FiMessageSquare } from 'react-icons/fi';

interface FeedbackButtonProps {
  className?: string;
}

export default function FeedbackButton({ className = '' }: FeedbackButtonProps) {
  return (
    <Link
      href="/feedback"
      className={`fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 transform hover:scale-105 ${className} button-press-effect`}
      aria-label="提供反馈"
      title="提供反馈"
    >
      <div className="flex items-center justify-center">
        <FiMessageSquare className="w-6 h-6" />
        <span className="ml-2 hidden md:inline">反馈</span>
      </div>
    </Link>
  );
} 
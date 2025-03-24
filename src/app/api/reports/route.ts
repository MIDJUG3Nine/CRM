import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 获取客户按状态分组的数据
    const customersByStatus = await prisma.customer.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // 获取任务按状态分组的数据
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // 准备月度销售数据（模拟数据）
    const currentDate = new Date();
    const salesByMonth = Array.from({ length: 6 }, (_, i) => {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5 + i, 1);
      const monthName = month.toLocaleDateString('zh-CN', { month: 'short' });
      
      // 生成随机销售额
      const total = Math.floor(Math.random() * 100000) + 10000;
      
      return {
        month: monthName,
        total
      };
    });

    // 转换数据格式
    const formattedCustomersByStatus = customersByStatus.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    const formattedTasksByStatus = tasksByStatus.map(item => ({
      status: item.status,
      count: item._count.id
    }));

    // 返回JSON格式的响应
    return NextResponse.json({
      customersByStatus: formattedCustomersByStatus,
      tasksByStatus: formattedTasksByStatus,
      salesByMonth
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 
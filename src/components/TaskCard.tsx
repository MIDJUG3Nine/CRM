import React from 'react';
import { FiCalendar, FiClock, FiFlag, FiUser, FiBriefcase } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 优先级配置
const priorityConfig = {
  LOW: { label: '低', color: 'text-gray-500 bg-gray-100' },
  MEDIUM: { label: '中', color: 'text-blue-500 bg-blue-100' },
  HIGH: { label: '高', color: 'text-orange-500 bg-orange-100' },
  URGENT: { label: '紧急', color: 'text-red-500 bg-red-100' }
};

// 任务属性接口
interface Task {
  id: string;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string | null;
  assignee?: {
    id: string;
    name: string;
  } | null;
  customer?: {
    id: string;
    name: string;
  } | null;
}

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  // 格式化截止日期
  const formattedDueDate = task.dueDate 
    ? formatDistanceToNow(new Date(task.dueDate), { 
        addSuffix: true, 
        locale: zhCN 
      })
    : null;
  
  // 判断任务是否过期
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
  
  // 获取状态标签
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'PENDING': return '待处理';
      case 'IN_PROGRESS': return '进行中';
      case 'COMPLETED': return '已完成';
      case 'DELAYED': return '已延期';
      case 'CANCELLED': return '已取消';
      default: return status;
    }
  };
  
  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'DELAYED': return 'text-red-600 bg-red-50';
      case 'CANCELLED': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow p-3 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
        <h3 className="font-medium text-gray-900 truncate flex-1 mb-1 sm:mb-0" title={task.title}>
          {task.title}
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[task.priority].color}`}>
            {priorityConfig[task.priority].label}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-600">
        {task.assignee && (
          <div className="flex items-center" title={`负责人: ${task.assignee.name}`}>
            <FiUser className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{task.assignee.name}</span>
          </div>
        )}
        
        {task.customer && (
          <div className="flex items-center" title={`客户: ${task.customer.name}`}>
            <FiBriefcase className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span className="truncate">{task.customer.name}</span>
          </div>
        )}
        
        {formattedDueDate && (
          <div className="flex items-center col-span-1 sm:col-span-2" title={`截止日期: ${task.dueDate}`}>
            <FiCalendar className={`w-4 h-4 mr-1.5 flex-shrink-0 ${isOverdue ? 'text-red-500' : ''}`} />
            <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
              {formattedDueDate}
            </span>
          </div>
        )}
      </div>
      
      {isOverdue && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-8 border-r-8 border-red-500 border-l-transparent border-b-transparent"></div>
      )}
    </div>
  );
} 
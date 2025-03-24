"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided, DropResult } from 'react-beautiful-dnd';
import { FiPlus, FiMoreHorizontal, FiClock, FiUser, FiCalendar, FiCheck, FiXCircle } from 'react-icons/fi';
import { LoadingState, PageTransition } from '@/components/ui/LoadingState';
import { ApiErrorState } from '@/components/ui/ErrorState';
import { toast } from '@/components/ui/Notifications';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: User | null;
  creator: User | null;
  assignedToId: string;
  assignedTo: User;
  createdById: string;
  createdBy: User;
}

interface BoardColumn {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

const TasksBoard = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [filter, setFilter] = useState('ALL');

  // 获取用户和任务数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 获取当前用户
        const userResponse = await fetch('/api/auth/user');
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await userResponse.json();
        setCurrentUser(userData.user);
        
        // 获取任务列表
        const tasksResponse = await fetch('/api/tasks');
        if (!tasksResponse.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const tasksData = await tasksResponse.json();
        
        // 初始化列
        const initialColumns: BoardColumn[] = [
          { id: 'PENDING', title: '待办', tasks: [], color: 'bg-gray-100' },
          { id: 'IN_PROGRESS', title: '进行中', tasks: [], color: 'bg-blue-100' },
          { id: 'REVIEW', title: '待审核', tasks: [], color: 'bg-yellow-100' },
          { id: 'COMPLETED', title: '已完成', tasks: [], color: 'bg-green-100' },
          { id: 'CANCELLED', title: '已取消', tasks: [], color: 'bg-red-100' },
        ];
        
        // 将任务分配到对应的列
        if (tasksData && tasksData.tasks && Array.isArray(tasksData.tasks)) {
          tasksData.tasks.forEach((task: Task) => {
            const column = initialColumns.find(col => col.id === task.status);
            if (column) {
              column.tasks.push(task);
            }
          });
          
          setTasks(tasksData.tasks);
        } else {
          console.warn('No tasks data or invalid format:', tasksData);
          setTasks([]);
        }
        
        setColumns(initialColumns);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load tasks. Please try again later.');
        toast.error({
          title: '加载失败',
          message: err instanceof Error ? err.message : '加载任务列表时发生错误',
        });
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    };
    
    fetchData();
  }, [isRetrying]);

  // 处理拖放结束事件
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // 如果拖放到了列表外部或没有改变位置
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // 创建新的列数组以更新状态
    const newColumns = [...columns];
    
    // 找到源列和目标列
    const sourceColumn = newColumns.find(col => col.id === source.droppableId);
    const destinationColumn = newColumns.find(col => col.id === destination.droppableId);
    
    if (!sourceColumn || !destinationColumn) return;
    
    // 获取被拖拽的任务
    const task = sourceColumn.tasks[source.index];
    
    // 从源列中移除任务
    sourceColumn.tasks.splice(source.index, 1);
    
    // 将任务添加到目标列
    destinationColumn.tasks.splice(destination.index, 0, task);
    
    // 更新UI
    setColumns(newColumns);
    
    // 更新服务器上的任务状态
    if (source.droppableId !== destination.droppableId) {
      try {
        const response = await fetch(`/api/tasks/${draggableId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: destination.droppableId,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update task status');
        }
      } catch (error) {
        console.error('Error updating task status:', error);
        // 回滚UI状态
        sourceColumn.tasks.splice(source.index, 0, task);
        destinationColumn.tasks.splice(destination.index, 1);
        setColumns([...newColumns]);
      }
    }
  };

  // 打开新建任务模态框
  const openNewTaskModal = (status: string) => {
    setNewTaskStatus(status);
    setIsModalOpen(true);
  };

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // 获取优先级样式
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 判断是否已经过期
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleStatusChange = async (taskId: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      // 乐观更新UI
      setTasks(currentTasks =>
        currentTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      // 发送API请求
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '更新任务状态失败');
      }
      
      // 显示成功消息
      toast.success({
        title: '状态已更新',
        message: '任务状态已成功更新',
        duration: 3000
      });
    } catch (err) {
      // 恢复原始任务列表
      const originalTask = tasks.find(task => task.id === taskId);
      if (originalTask) {
        setTasks(currentTasks =>
          currentTasks.map(task =>
            task.id === taskId ? originalTask : task
          )
        );
      }
      
      // 显示错误消息
      toast.error({
        title: '更新失败',
        message: err instanceof Error ? err.message : '更新任务状态时发生错误',
      });
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setError(null); // 清除错误状态
  };

  // 根据过滤条件过滤任务
  const filteredTasks = tasks.filter(task => {
    if (filter === 'ALL') return true;
    return task.status === filter;
  });

  // 按照截止日期和优先级对任务进行排序
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // 首先按照状态排序（未完成的任务优先）
    if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
    if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
    
    // 然后按照优先级排序
    const priorityOrder: Record<string, number> = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2, 'URGENT': 0 };
    
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // 最后按照截止日期排序
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'HIGH': return { text: '高', class: 'bg-red-100 text-red-800' };
      case 'MEDIUM': return { text: '中', class: 'bg-yellow-100 text-yellow-800' };
      case 'LOW': return { text: '低', class: 'bg-green-100 text-green-800' };
      default: return { text: priority, class: 'bg-gray-100 text-gray-800' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return { text: '待处理', class: 'bg-yellow-100 text-yellow-800' };
      case 'IN_PROGRESS': return { text: '进行中', class: 'bg-blue-100 text-blue-800' };
      case 'COMPLETED': return { text: '已完成', class: 'bg-green-100 text-green-800' };
      default: return { text: status, class: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingState size="lg" text="加载任务列表..." />
      </div>
    );
  }

  if (error) {
    return (
      <ApiErrorState
        title="加载任务列表错误"
        message={error}
        onRetry={handleRetry}
        isRetrying={isRetrying}
      />
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">任务管理</h1>
          <Link
            href="/dashboard/tasks/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center"
          >
            <FiPlus className="mr-2" />
            添加任务
          </Link>
        </div>
        
        {/* 状态过滤器 */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-md ${
                filter === 'ALL'
                  ? 'bg-indigo-100 text-indigo-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-2 rounded-md ${
                filter === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              待处理
            </button>
            <button
              onClick={() => setFilter('IN_PROGRESS')}
              className={`px-4 py-2 rounded-md ${
                filter === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              进行中
            </button>
            <button
              onClick={() => setFilter('COMPLETED')}
              className={`px-4 py-2 rounded-md ${
                filter === 'COMPLETED'
                  ? 'bg-green-100 text-green-800 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              已完成
            </button>
          </div>
        </div>
        
        {/* 任务列表 */}
        {sortedTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow ${
                  task.status === 'COMPLETED' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold truncate">{task.title}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      getPriorityLabel(task.priority).class
                    }`}
                  >
                    {getPriorityLabel(task.priority).text}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2" title={task.description}>
                  {task.description}
                </p>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <FiClock className="mr-1" />
                  <span>
                    截止: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : '无截止日期'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      getStatusLabel(task.status).class
                    }`}
                  >
                    {getStatusLabel(task.status).text}
                  </span>
                  
                  <div className="flex space-x-2">
                    {task.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                        className="text-green-600 hover:text-green-900"
                        title="标记为已完成"
                      >
                        <FiCheck className="w-5 h-5" />
                      </button>
                    )}
                    {task.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                        className="text-red-600 hover:text-red-900"
                        title="重新开始"
                      >
                        <FiXCircle className="w-5 h-5" />
                      </button>
                    )}
                    <Link
                      href={`/dashboard/tasks/${task.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      详情
                    </Link>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    指派给: {task.assignedTo?.name || '未分配'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              {filter === 'ALL' ? '暂无任务' : `没有${getStatusLabel(filter).text}的任务`}
            </p>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default TasksBoard; 
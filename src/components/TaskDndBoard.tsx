'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import axios from 'axios';
import { FiAlertCircle, FiCalendar, FiClock, FiLoader, FiPlus, FiFilter, FiRefreshCw, FiX } from 'react-icons/fi';
import TaskCard from './TaskCard';
import { useRouter } from 'next/navigation';

// 任务状态配置
const taskStatusConfig = {
  PENDING: { label: '待处理', color: 'bg-yellow-50 border-yellow-200' },
  IN_PROGRESS: { label: '进行中', color: 'bg-blue-50 border-blue-200' },
  COMPLETED: { label: '已完成', color: 'bg-green-50 border-green-200' },
  DELAYED: { label: '已延期', color: 'bg-red-50 border-red-200' },
  CANCELLED: { label: '已取消', color: 'bg-gray-50 border-gray-200' }
};

// 任务接口
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: keyof typeof taskStatusConfig;
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
  comments?: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskDndBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, newStatus: string) => Promise<void>;
  onTaskClick?: (taskId: string) => void;
  onAddTask?: () => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function TaskDndBoard({
  tasks,
  onTaskMove,
  onTaskClick,
  onAddTask,
  loading = false,
  error = null,
  onRefresh
}: TaskDndBoardProps) {
  const [columns, setColumns] = useState<Record<string, Task[]>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<string | null>(null);
  const router = useRouter();
  
  // 检测是否为移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // 初始化移动视图的活动列
  useEffect(() => {
    if (isMobile && !mobileActiveColumn && Object.keys(columns).length > 0) {
      setMobileActiveColumn(Object.keys(columns)[0]);
    }
  }, [isMobile, columns, mobileActiveColumn]);

  // 根据任务状态对任务进行分组
  useEffect(() => {
    const groupedTasks = tasks.reduce<Record<string, Task[]>>((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {});
    
    // 确保所有状态列都存在，即使没有任务
    Object.keys(taskStatusConfig).forEach(status => {
      if (!groupedTasks[status]) {
        groupedTasks[status] = [];
      }
    });
    
    setColumns(groupedTasks);
  }, [tasks]);

  // 处理拖拽结束事件
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // 如果没有目标位置或者拖拽到相同位置，则不做任何操作
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    // 找到被拖拽的任务
    const task = columns[source.droppableId].find(task => task.id === draggableId);
    if (!task) return;

    // 更新前端状态
    const newColumns = { ...columns };
    
    // 从源列移除任务
    newColumns[source.droppableId] = newColumns[source.droppableId].filter(
      t => t.id !== draggableId
    );
    
    // 更新任务状态
    const updatedTask = { ...task, status: destination.droppableId as any };
    
    // 将任务添加到目标列
    newColumns[destination.droppableId] = [
      ...newColumns[destination.droppableId].slice(0, destination.index),
      updatedTask,
      ...newColumns[destination.droppableId].slice(destination.index)
    ];
    
    setColumns(newColumns);
    
    // 调用回调通知父组件
    if (onTaskMove) {
      onTaskMove(draggableId, destination.droppableId);
    }
  };

  // 过滤要显示的状态列
  const filteredColumns = activeFilter
    ? { [activeFilter]: columns[activeFilter] }
    : columns;
  
  // 移动设备上显示的列
  const mobileColumns = mobileActiveColumn
    ? { [mobileActiveColumn]: columns[mobileActiveColumn] }
    : {};

  // 当前视图中的列
  const displayColumns = isMobile ? mobileColumns : filteredColumns;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 rounded-lg">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={onRefresh} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors inline-flex items-center"
        >
          <FiRefreshCw className="mr-2" /> 重试
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddTask}
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center text-sm"
          >
            <FiPlus className="mr-1" /> 新增任务
          </button>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
              aria-label="刷新任务"
            >
              <FiRefreshCw />
            </button>
          )}
        </div>
        
        {/* 移动设备状态选择器 */}
        {isMobile && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 w-full">
            {Object.entries(taskStatusConfig).map(([status, config]) => (
              <button
                key={status}
                onClick={() => setMobileActiveColumn(status)}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  mobileActiveColumn === status 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {config.label} ({columns[status]?.length || 0})
              </button>
            ))}
          </div>
        )}
        
        {/* 桌面端过滤器 */}
        {!isMobile && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">筛选:</span>
            <div className="flex items-center space-x-1">
              {Object.entries(taskStatusConfig).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => setActiveFilter(activeFilter === status ? null : status)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    activeFilter === status 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {config.label}
                </button>
              ))}
              {activeFilter && (
                <button
                  onClick={() => setActiveFilter(null)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  aria-label="清除筛选"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 任务看板 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 h-full flex-1 overflow-hidden`}>
          {Object.entries(displayColumns).map(([status, statusTasks]) => (
            <div key={status} className="flex-1 min-w-[250px] flex flex-col">
              <div className={`p-3 rounded-t-md ${taskStatusConfig[status as keyof typeof taskStatusConfig].color} border-b border-b-${status === 'COMPLETED' ? 'green' : status === 'PENDING' ? 'yellow' : status === 'IN_PROGRESS' ? 'blue' : status === 'DELAYED' ? 'red' : 'gray'}-300`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {taskStatusConfig[status as keyof typeof taskStatusConfig].label}
                  </h3>
                  <span className="text-sm bg-white bg-opacity-60 rounded-full px-2 py-0.5">
                    {statusTasks.length}
                  </span>
                </div>
              </div>
              
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
                    } rounded-b-md border border-t-0 border-gray-200 min-h-[200px]`}
                  >
                    {statusTasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-gray-500 italic">
                        暂无任务
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {statusTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1
                                }}
                                className={`${snapshot.isDragging ? 'shadow-md' : ''}`}
                              >
                                <TaskCard 
                                  task={task} 
                                  onClick={() => onTaskClick && onTaskClick(task.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
} 
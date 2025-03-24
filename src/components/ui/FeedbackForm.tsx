'use client';

import { useState } from 'react';
import { Input, TextArea, Select, FormDivider } from './FormElements';
import { LoadingButton } from './LoadingState';
import { toast } from './Notifications';
import { FiMessageSquare, FiTag, FiSmile } from 'react-icons/fi';

const feedbackTypes = [
  { value: 'bug', label: '系统问题/错误' },
  { value: 'feature', label: '功能建议' },
  { value: 'ui', label: '界面/用户体验改进' },
  { value: 'performance', label: '性能问题' },
  { value: 'other', label: '其他' }
];

const priorities = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' }
];

export interface FeedbackData {
  title: string;
  type: string;
  description: string;
  priority: string;
  email?: string;
}

interface FeedbackFormProps {
  onSubmit: (data: FeedbackData) => Promise<void>;
  includeEmail?: boolean;
  showTitle?: boolean;
  titleText?: string;
  submitText?: string;
  className?: string;
}

export default function FeedbackForm({
  onSubmit,
  includeEmail = false,
  showTitle = true,
  titleText = '用户反馈',
  submitText = '提交反馈',
  className = ''
}: FeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackData>({
    title: '',
    type: 'bug',
    description: '',
    priority: 'medium',
    email: ''
  });
  
  const [formTouched, setFormTouched] = useState({
    title: false,
    type: false,
    description: false,
    priority: false,
    email: false
  });
  
  const [formErrors, setFormErrors] = useState({
    title: '',
    description: '',
    email: ''
  });
  
  const [loading, setLoading] = useState(false);

  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch(name) {
      case 'title':
        if (!value.trim()) error = '请输入反馈标题';
        break;
      case 'description':
        if (!value.trim()) error = '请输入详细描述';
        break;
      case 'email':
        if (includeEmail && value.trim() && !/\S+@\S+\.\S+/.test(value)) {
          error = '请输入有效的邮箱地址';
        }
        break;
    }
    
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
    
    return error;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    setFormTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 触摸所有必填字段
    const touchedFields = {
      ...formTouched,
      title: true,
      description: true,
      type: true,
      priority: true
    };
    
    if (includeEmail) {
      touchedFields.email = true;
    }
    
    setFormTouched(touchedFields);
    
    // 验证所有必填字段
    const titleError = validateField('title', formData.title);
    const descriptionError = validateField('description', formData.description);
    let emailError = '';
    
    if (includeEmail) {
      emailError = validateField('email', formData.email || '');
    }
    
    if (titleError || descriptionError || emailError) {
      toast.error({
        title: '表单验证失败',
        message: '请检查并填写所有必填字段'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await onSubmit(formData);
      
      // 重置表单
      setFormData({
        title: '',
        type: 'bug',
        description: '',
        priority: 'medium',
        email: ''
      });
      
      setFormTouched({
        title: false,
        type: false,
        description: false,
        priority: false,
        email: false
      });
      
      toast.success({
        title: '反馈已提交',
        message: '感谢您的反馈，我们会尽快处理'
      });
    } catch (error) {
      toast.error({
        title: '提交失败',
        message: '反馈提交失败，请稍后重试'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm ${className}`}>
      {showTitle && (
        <h2 className="text-xl font-semibold mb-4">{titleText}</h2>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="title"
          label="反馈标题"
          placeholder="简单描述您的问题或建议"
          value={formData.title}
          onChange={handleChange}
          error={formErrors.title}
          touched={formTouched.title}
          leftIcon={<FiMessageSquare />}
          required
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            name="type"
            label="反馈类型"
            value={formData.type}
            onChange={handleChange}
          >
            {feedbackTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          
          <Select
            name="priority"
            label="优先级"
            value={formData.priority}
            onChange={handleChange}
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </Select>
        </div>
        
        <TextArea
          name="description"
          label="详细描述"
          placeholder="请详细描述您遇到的问题或建议，包括任何相关的步骤、页面或功能"
          value={formData.description}
          onChange={handleChange}
          error={formErrors.description}
          touched={formTouched.description}
          rows={5}
          required
        />
        
        {includeEmail && (
          <Input
            name="email"
            label="联系邮箱（可选）"
            placeholder="如需回复，请留下您的邮箱"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={formErrors.email}
            touched={formTouched.email}
            leftIcon={<FiSmile />}
            tip="我们可能会联系您了解更多详情"
          />
        )}
        
        <FormDivider />
        
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            isLoading={loading}
            loadingText="提交中..."
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {submitText}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
} 
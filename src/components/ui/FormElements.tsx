import React, { forwardRef } from 'react';
import { FiAlertCircle, FiCheck, FiInfo } from 'react-icons/fi';

// 表单错误消息组件
export const FormError = ({ message }: { message: string }) => {
  if (!message) return null;
  
  return (
    <div className="flex items-center text-red-500 text-sm mt-1 animate-slideInUp">
      <FiAlertCircle className="mr-1 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

// 表单成功消息组件
export const FormSuccess = ({ message }: { message: string }) => {
  if (!message) return null;
  
  return (
    <div className="flex items-center text-green-500 text-sm mt-1 animate-slideInUp">
      <FiCheck className="mr-1 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

// 表单提示组件
export const FormTip = ({ tip }: { tip: string }) => {
  if (!tip) return null;
  
  return (
    <div className="flex items-center text-gray-500 text-sm mt-1">
      <FiInfo className="mr-1 flex-shrink-0" />
      <span>{tip}</span>
    </div>
  );
};

// 带验证状态的输入框组件
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  tip?: string;
  touched?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, tip, touched = false, className = '', leftIcon, rightIcon, ...props }, ref) => {
    const hasError = touched && error;
    const hasSuccess = touched && success;
    
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              block w-full px-3 py-2 border rounded-md shadow-sm transition-all duration-200
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${hasError 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : hasSuccess 
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-opacity-50
              ${className}
            `}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
              {rightIcon}
            </div>
          )}
          
          {touched && error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FiAlertCircle className="text-red-500" />
            </div>
          )}
          
          {touched && !error && success && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FiCheck className="text-green-500" />
            </div>
          )}
        </div>
        
        <FormError message={hasError || ''} />
        <FormSuccess message={hasSuccess || ''} />
        <FormTip tip={tip || ''} />
      </div>
    );
  }
);

Input.displayName = 'Input';

// 带验证状态的下拉框组件
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  success?: string;
  tip?: string;
  touched?: boolean;
  children: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, success, tip, touched = false, className = '', children, ...props }, ref) => {
    const hasError = touched && error;
    const hasSuccess = touched && success;
    
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            className={`
              block w-full px-3 py-2 border rounded-md shadow-sm appearance-none transition-all duration-200
              ${hasError 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : hasSuccess 
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-opacity-50 pr-10
              ${className}
            `}
            {...props}
          >
            {children}
          </select>
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
            </svg>
          </div>
          
          {touched && error && (
            <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
              <FiAlertCircle className="text-red-500" />
            </div>
          )}
          
          {touched && !error && success && (
            <div className="absolute inset-y-0 right-8 pr-3 flex items-center pointer-events-none">
              <FiCheck className="text-green-500" />
            </div>
          )}
        </div>
        
        <FormError message={hasError || ''} />
        <FormSuccess message={hasSuccess || ''} />
        <FormTip tip={tip || ''} />
      </div>
    );
  }
);

Select.displayName = 'Select';

// 带验证状态的文本域组件
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  tip?: string;
  touched?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, success, tip, touched = false, className = '', ...props }, ref) => {
    const hasError = touched && error;
    const hasSuccess = touched && success;
    
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={ref}
            className={`
              block w-full px-3 py-2 border rounded-md shadow-sm transition-all duration-200
              ${hasError 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : hasSuccess 
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-opacity-50
              ${className}
            `}
            {...props}
          />
        </div>
        
        <FormError message={hasError || ''} />
        <FormSuccess message={hasSuccess || ''} />
        <FormTip tip={tip || ''} />
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

// 复选框组件
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, touched = false, className = '', ...props }, ref) => {
    const hasError = touched && error;
    
    return (
      <div className="mb-3">
        <div className="flex items-center">
          <input
            ref={ref}
            type="checkbox"
            className={`
              w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer
              ${hasError ? 'border-red-300 focus:ring-red-500' : ''}
              ${className}
            `}
            {...props}
          />
          <label className="ml-2 block text-sm text-gray-700 cursor-pointer">
            {label}
          </label>
        </div>
        
        <FormError message={hasError || ''} />
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// 单选按钮组组件
interface RadioGroupProps {
  label?: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  touched?: boolean;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ label, name, options, value, onChange, error, touched = false }, ref) => {
    const hasError = touched && error;
    
    return (
      <div className="mb-4" ref={ref}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        
        <div className="space-y-2">
          {options.map((option) => (
            <div key={option.value} className="flex items-center">
              <input
                id={`${name}-${option.value}`}
                name={name}
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={onChange}
                className={`
                  w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer
                  ${hasError ? 'border-red-300 focus:ring-red-500' : ''}
                `}
              />
              <label
                htmlFor={`${name}-${option.value}`}
                className="ml-2 block text-sm text-gray-700 cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        
        <FormError message={hasError || ''} />
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

// 表单分割线
export const FormDivider = ({ label }: { label?: string }) => {
  if (!label) {
    return <hr className="my-6 border-gray-200" />;
  }
  
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200"></div>
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-4 text-sm text-gray-500">{label}</span>
      </div>
    </div>
  );
}; 
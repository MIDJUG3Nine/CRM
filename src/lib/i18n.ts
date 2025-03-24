// 国际化翻译支持
type LanguageKey = 'zh' | 'en';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

// 翻译字典
const translations: Translations = {
  zh: {
    // 导航
    'dashboard': '仪表盘',
    'customers': '客户管理',
    'tasks': '任务管理',
    'contacts': '联系记录',
    'reports': '报表分析',
    'users': '用户管理',
    'settings': '系统设置',
    'logout': '退出登录',
    
    // 客户管理
    'customer_list': '客户列表',
    'add_customer': '添加客户',
    'edit_customer': '编辑客户',
    'customer_details': '客户详情',
    'customer_name': '客户名称',
    'contact_person': '联系人',
    'phone': '电话',
    'email': '邮箱',
    'address': '地址',
    'status': '状态',
    'actions': '操作',
    'delete': '删除',
    'edit': '编辑',
    'view': '查看',
    
    // 任务管理
    'task_list': '任务列表',
    'add_task': '添加任务',
    'edit_task': '编辑任务',
    'task_title': '任务标题',
    'task_description': '任务描述',
    'assigned_to': '分配给',
    'due_date': '截止日期',
    'priority': '优先级',
    'high': '高',
    'medium': '中',
    'low': '低',
    'completed': '已完成',
    'pending': '待处理',
    'in_progress': '进行中',
    
    // 通用
    'save': '保存',
    'cancel': '取消',
    'confirm': '确认',
    'submit': '提交',
    'search': '搜索',
    'filter': '筛选',
    'no_data': '暂无数据',
    'loading': '加载中...',
    'error': '错误',
    'success': '成功',
    'warning': '警告',
    'info': '信息',
    'date': '日期',
    'time': '时间',
    'description': '描述',
    'note': '备注',
    'select': '请选择',
    'required': '必填项',
    'invalid': '无效',
    
    // 错误消息
    'not_found': '未找到',
    'unauthorized': '未授权',
    'forbidden': '禁止访问',
    'server_error': '服务器错误',
    'validation_error': '验证错误',
    'network_error': '网络错误',
    'unknown_error': '未知错误',
  },
  en: {
    // English translations can be added here
  },
};

// 默认语言
let currentLanguage: LanguageKey = 'zh';

/**
 * 翻译文本
 * @param key 翻译键
 * @returns 翻译后的文本
 */
export function t(key: string): string {
  if (!translations[currentLanguage]) {
    return key;
  }
  
  return translations[currentLanguage][key] || key;
}

/**
 * 设置当前语言
 * @param lang 语言代码
 */
export function setLanguage(lang: LanguageKey): void {
  if (translations[lang]) {
    currentLanguage = lang;
    // 保存语言偏好到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  }
}

/**
 * 获取当前语言
 * @returns 当前语言代码
 */
export function getLanguage(): LanguageKey {
  return currentLanguage;
}

/**
 * 初始化语言设置
 */
export function initLanguage(): void {
  // 从localStorage获取语言设置
  if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('language') as LanguageKey;
    if (savedLang && translations[savedLang]) {
      currentLanguage = savedLang;
    }
  }
}

// 初始化语言
if (typeof window !== 'undefined') {
  initLanguage();
}

export default { t, setLanguage, getLanguage, initLanguage }; 
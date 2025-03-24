# CRM 系统 Bug 修复指南

本文档提供了 CRM 系统 bug 修复的标准流程和最佳实践，帮助开发团队高效、一致地解决系统问题。

## 目录

1. [Bug 修复流程](#bug-修复流程)
2. [常见问题解决方法](#常见问题解决方法)
3. [测试与验证](#测试与验证)
4. [发布与部署](#发布与部署)
5. [预防措施](#预防措施)

## Bug 修复流程

### 1. Bug 报告与记录

- **Bug 报告标准格式**
  ```
  标题：[模块] 简短描述问题
  
  严重程度：[紧急/高/中/低]
  环境：[开发/测试/生产]
  影响范围：[特定用户/特定角色/所有用户]
  
  复现步骤：
  1. 步骤一
  2. 步骤二
  3. ...
  
  期望结果：
  实际结果：
  
  附加信息：
  - 浏览器/设备信息
  - 屏幕截图/录屏
  - 错误日志/控制台输出
  ```

- **优先级评估**
  | 严重程度 | 影响范围 | 优先级 | 修复时间目标 |
  |---------|---------|--------|------------|
  | 紧急    | 所有用户 | P0    | 立即修复    |
  | 高      | 所有用户 | P1    | 24小时内    |
  | 中      | 特定角色 | P2    | 3天内       |
  | 低      | 特定用户 | P3    | 下一迭代     |

### 2. Bug 分析

- **环境复现**
  ```bash
  # 在本地环境复现问题
  git checkout develop
  git pull
  npm install
  npm run dev
  
  # 或者使用特定的测试环境
  npm run dev:test
  ```

- **诊断技术**
  - **前端问题**
    - 使用浏览器开发工具检查 Console 错误
    - 使用 React DevTools 检查组件状态
    - 检查网络请求和响应
  
  - **后端问题**
    - 检查服务器日志文件
    - 使用 debug 日志级别获取详细信息
    - 分析数据库查询执行计划

- **根本原因分析**
  ```
  问题：用户无法创建新客户记录
  表象：点击提交按钮后没有响应
  排查：
  1. 前端控制台显示 API 500 错误
  2. 服务器日志显示数据验证失败
  3. 根本原因：API 缺少对空字符串输入的处理
  ```

### 3. 修复实施

- **创建修复分支**
  ```bash
  # 从最新的开发分支创建修复分支
  git checkout develop
  git pull
  git checkout -b fix/customer-creation-validation
  ```

- **修复方案示例**
  ```typescript
  // 修复前：
  function validateCustomerData(data: CustomerInput) {
    if (!data.name) {
      throw new Error('客户名称必填');
    }
    // 其他验证...
  }
  
  // 修复后：
  function validateCustomerData(data: CustomerInput) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('客户名称必填且不能仅包含空格');
    }
    // 其他验证...
  }
  ```

- **注释规范**
  ```typescript
  /**
   * 修复：客户创建表单验证问题
   * 
   * 问题：表单提交时，如果用户输入的全是空格，后端会接收并报错
   * 修复：在前端和后端都增加了对空字符串和仅包含空格的输入进行验证
   * 
   * 相关 Issue: #123
   * 日期: 2023-04-15
   */
  ```

### 4. 提交与代码审查

- **提交规范**
  ```bash
  # 提交修复
  git add .
  git commit -m "fix: 修复客户创建表单验证问题 (#123)"
  git push origin fix/customer-creation-validation
  ```

- **Pull Request 模板**
  ```
  ## 问题描述
  简要描述修复的问题
  
  ## 修复方案
  详细说明修复方法和修改点
  
  ## 测试方法
  如何验证修复有效
  
  ## 影响范围
  此修复可能影响的其他功能
  
  ## 相关链接
  - Issue: #123
  ```

- **代码审查清单**
  - [ ] 修复是否解决了根本问题？
  - [ ] 是否添加了适当的测试？
  - [ ] 是否考虑了边缘情况？
  - [ ] 代码是否符合项目规范？
  - [ ] 修复是否可能引入新问题？

## 常见问题解决方法

### 前端常见问题

#### 表单问题

- **表单提交无反应**
  ```typescript
  // 常见问题：阻止默认行为后未执行提交逻辑
  // 解决方法：
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // 必须放在开头
    
    // 验证和提交逻辑
    if (isValid) {
      submitForm(formData);
    }
  };
  ```

- **验证错误不显示**
  ```typescript
  // 常见问题：使用受控组件时没有正确管理错误状态
  // 解决方法：
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = '客户名称必填';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 在表单组件中显示错误
  <Input 
    value={formData.name} 
    onChange={handleChange} 
    error={errors.name}
  />
  ```

#### 状态管理问题

- **组件不更新**
  ```typescript
  // 常见问题：不可变性规则被打破
  // 错误示例：
  const handleAddItem = () => {
    items.push(newItem); // 直接修改数组
    setItems(items); // 引用没变，组件不会更新
  };
  
  // 正确做法：
  const handleAddItem = () => {
    setItems([...items, newItem]); // 创建新数组
  };
  ```

- **状态丢失**
  ```typescript
  // 常见问题：键值不稳定导致组件重新挂载
  // 错误示例：
  {items.map((item, index) => (
    <ListItem key={index} item={item} /> // 使用索引作为键
  ))}
  
  // 正确做法：
  {items.map((item) => (
    <ListItem key={item.id} item={item} /> // 使用稳定的 ID
  ))}
  ```

#### 性能问题

- **页面加载缓慢**
  ```typescript
  // 常见问题：没有分割代码和延迟加载
  // 解决方法：
  import dynamic from 'next/dynamic';
  
  // 动态导入大型组件
  const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
    loading: () => <LoadingState />,
    ssr: false, // 如果不需要 SSR
  });
  ```

- **长列表渲染慢**
  ```typescript
  // 常见问题：一次性渲染大量数据
  // 解决方法：使用虚拟化列表
  import { FixedSizeList } from 'react-window';
  
  const CustomerList = ({ customers }) => (
    <FixedSizeList
      height={500}
      width="100%"
      itemCount={customers.length}
      itemSize={50}
    >
      {({ index, style }) => (
        <div style={style}>
          <CustomerItem customer={customers[index]} />
        </div>
      )}
    </FixedSizeList>
  );
  ```

### 后端常见问题

#### API 问题

- **处理错误码不一致**
  ```typescript
  // 常见问题：不同接口返回不同的错误格式
  // 解决方法：统一错误处理中间件
  const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = '服务器内部错误';
    
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = err.message;
    } else if (err.name === 'UnauthorizedError') {
      statusCode = 401;
      message = '未授权访问';
    }
    
    res.status(statusCode).json({
      error: true,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
  
  app.use(errorHandler);
  ```

- **请求超时**
  ```typescript
  // 常见问题：长时间运行的操作导致 API 超时
  // 解决方法：优化操作或使用异步处理
  
  // 优化查询示例
  const getCustomers = async (req, res) => {
    try {
      // 使用更高效的查询
      const customers = await prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          // 仅选择需要的字段
        },
        where: { 
          isDeleted: false 
          // 添加必要的筛选条件
        },
        take: 50, // 限制结果数量
      });
      
      res.json({ customers });
    } catch (error) {
      next(error);
    }
  };
  ```

#### 数据库问题

- **查询性能差**
  ```typescript
  // 常见问题：没有索引或查询未优化
  // 解决方法：
  
  // 1. 添加适当的索引（在 Prisma schema 中）
  model Customer {
    id        Int      @id @default(autoincrement())
    email     String   @unique
    name      String
    createdAt DateTime @default(now())
    
    @@index([name])
    @@index([createdAt])
  }
  
  // 2. 优化查询，避免 N+1 问题
  // 错误示例：
  const tasks = await prisma.task.findMany();
  for (const task of tasks) {
    // 每个任务都单独查询用户，造成 N+1 查询
    task.user = await prisma.user.findUnique({ where: { id: task.userId } });
  }
  
  // 正确做法：
  const tasks = await prisma.task.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  ```

- **事务错误**
  ```typescript
  // 常见问题：复杂操作没有使用事务
  // 解决方法：使用事务确保数据一致性
  
  const transferCustomer = async (customerId, newOwnerId) => {
    try {
      // 使用事务包裹多个操作
      return await prisma.$transaction(async (tx) => {
        // 1. 更新客户所有者
        const updatedCustomer = await tx.customer.update({
          where: { id: customerId },
          data: { ownerId: newOwnerId },
        });
        
        // 2. 创建转移记录
        await tx.customerTransferLog.create({
          data: {
            customerId,
            fromOwnerId: updatedCustomer.previousOwnerId,
            toOwnerId: newOwnerId,
            transferredAt: new Date(),
          },
        });
        
        // 3. 创建通知
        await tx.notification.create({
          data: {
            userId: newOwnerId,
            type: 'CUSTOMER_ASSIGNED',
            content: `客户 ${updatedCustomer.name} 已分配给您。`,
          },
        });
        
        return updatedCustomer;
      });
    } catch (error) {
      console.error('转移客户失败:', error);
      throw new Error('客户转移操作失败，请稍后再试');
    }
  };
  ```

### 身份验证问题

- **登录状态丢失**
  ```typescript
  // 常见问题：Token 配置不当
  // 解决方法：
  
  // 设置适当的 Cookie 选项
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    path: '/',
  });
  ```

- **JWT 过期处理**
  ```typescript
  // 常见问题：JWT 过期后前端无法处理
  // 解决方法：实现刷新令牌机制
  
  // 后端实现刷新令牌
  app.post('/api/refresh-token', async (req, res) => {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ error: '无刷新令牌' });
    }
    
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      
      if (!user) {
        return res.status(401).json({ error: '用户不存在' });
      }
      
      // 生成新的访问令牌
      const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      res.json({ accessToken });
    } catch (error) {
      res.status(401).json({ error: '刷新令牌无效或已过期' });
    }
  });
  
  // 前端拦截过期错误并刷新
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // 如果是认证错误且未尝试过刷新
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // 刷新令牌
          const { data } = await axios.post('/api/refresh-token');
          // 更新存储的令牌
          localStorage.setItem('accessToken', data.accessToken);
          // 更新请求头
          originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
          // 重试原始请求
          return axios(originalRequest);
        } catch (refreshError) {
          // 刷新失败，重定向到登录
          window.location.href = '/login?expired=true';
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
  ```

## 测试与验证

### 1. 修复验证步骤

- **本地测试**
  ```bash
  # 运行测试
  npm run test
  
  # 启动开发服务器进行手动测试
  npm run dev
  ```

- **单元测试**
  ```typescript
  // 为修复添加单元测试
  import { validateCustomerData } from '@/lib/validation';
  
  describe('validateCustomerData', () => {
    it('应拒绝空字符串名称', () => {
      expect(() => {
        validateCustomerData({ name: '', email: 'test@example.com' });
      }).toThrow('客户名称必填');
    });
    
    it('应拒绝仅包含空格的名称', () => {
      expect(() => {
        validateCustomerData({ name: '   ', email: 'test@example.com' });
      }).toThrow('客户名称必填且不能仅包含空格');
    });
    
    it('应接受有效的客户数据', () => {
      expect(() => {
        validateCustomerData({ name: '张三', email: 'test@example.com' });
      }).not.toThrow();
    });
  });
  ```

- **端到端测试**
  ```typescript
  // 使用 Cypress 进行端到端测试
  describe('客户创建表单', () => {
    beforeEach(() => {
      cy.login('admin@example.com', 'password');
      cy.visit('/customers/create');
    });
    
    it('应显示空名称的验证错误', () => {
      cy.get('[data-testid="customer-name"]').clear();
      cy.get('[data-testid="submit-button"]').click();
      cy.get('[data-testid="name-error"]').should('contain', '客户名称必填');
    });
    
    it('应显示空格名称的验证错误', () => {
      cy.get('[data-testid="customer-name"]').type('   ');
      cy.get('[data-testid="submit-button"]').click();
      cy.get('[data-testid="name-error"]').should('contain', '不能仅包含空格');
    });
    
    it('应成功创建有效客户', () => {
      cy.get('[data-testid="customer-name"]').type('测试客户');
      cy.get('[data-testid="customer-email"]').type('test@example.com');
      cy.get('[data-testid="submit-button"]').click();
      cy.url().should('include', '/customers/');
      cy.contains('测试客户').should('exist');
    });
  });
  ```

### 2. 回归测试

- **关联功能测试**
  - 识别可能受到修复影响的相关功能
  - 创建测试清单确保这些功能仍然正常工作

- **自动回归测试**
  ```bash
  # 运行所有测试或特定测试套件
  npm run test:regression
  
  # 或者运行特定类别的测试
  npm run test -- --testPathPattern=customer
  ```

### 3. 性能测试

- **如果修复涉及性能问题，进行基准测试**
  ```typescript
  // 测量查询性能
  const startTime = performance.now();
  const result = await getCustomers(filterParams);
  const endTime = performance.now();
  
  console.log(`查询耗时: ${endTime - startTime} ms`);
  console.log(`返回记录数: ${result.length}`);
  ```

## 发布与部署

### 1. 合并修复

- **合并到正确的分支**
  ```bash
  # 对于关键修复，直接合并到生产和开发分支
  git checkout main
  git merge --no-ff fix/customer-creation-validation
  git push origin main
  
  git checkout develop
  git merge --no-ff fix/customer-creation-validation
  git push origin develop
  
  # 删除修复分支
  git branch -d fix/customer-creation-validation
  git push origin --delete fix/customer-creation-validation
  ```

### 2. 发布管理

- **热修复部署**
  ```bash
  # 为热修复创建版本标签
  git tag -a v1.2.1 -m "修复客户创建表单验证问题"
  git push origin v1.2.1
  ```

- **发布说明**
  ```markdown
  ## v1.2.1 (2023-04-16)
  
  ### 错误修复
  
  - 修复客户创建表单验证问题 (#123)
    - 现在系统会正确检测并拒绝仅包含空格的客户名称
    - 改进了验证错误消息，提供更清晰的用户指导
  
  ### 部署说明
  
  - 此更新仅包含错误修复，无需数据库迁移
  - 建议所有环境尽快更新
  ```

### 3. 监控与确认

- **部署后检查**
  - 确认修复已成功部署
  - 监控错误报告和性能指标
  - 确认报告问题未再出现

- **用户反馈收集**
  - 向报告问题的用户确认修复
  - 收集用户对修复的反馈

## 预防措施

### 1. 改进测试覆盖率

- **确定测试覆盖率盲点**
  ```bash
  # 运行带覆盖率报告的测试
  npm run test -- --coverage
  ```

- **增加测试案例**
  ```typescript
  // 添加更多边缘案例测试
  it('应处理特殊字符', () => {
    expect(validateCustomerName('O\'Neill企业')).toBeTruthy();
  });
  
  it('应处理最大长度字符串', () => {
    const maxLengthName = 'A'.repeat(100);
    expect(validateCustomerName(maxLengthName)).toBeFalsy();
  });
  ```

### 2. 代码改进

- **增强验证逻辑**
  ```typescript
  // 集中验证逻辑，减少重复
  export function validateString(value: string, fieldName: string, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  } = {}): string | null {
    const { required = true, minLength, maxLength, pattern } = options;
    
    // 处理空值检查
    if (!value || value.trim() === '') {
      return required ? `${fieldName}必填且不能仅包含空格` : null;
    }
    
    const trimmedValue = value.trim();
    
    // 长度检查
    if (minLength && trimmedValue.length < minLength) {
      return `${fieldName}至少需要${minLength}个字符`;
    }
    
    if (maxLength && trimmedValue.length > maxLength) {
      return `${fieldName}不能超过${maxLength}个字符`;
    }
    
    // 模式检查
    if (pattern && !pattern.test(trimmedValue)) {
      return `${fieldName}格式不正确`;
    }
    
    return null;
  }
  
  // 使用集中式验证函数
  function validateCustomerData(data: CustomerInput): void {
    const errors: Record<string, string> = {};
    
    // 名称验证
    const nameError = validateString(data.name, '客户名称', {
      minLength: 2,
      maxLength: 50
    });
    if (nameError) errors.name = nameError;
    
    // 电子邮件验证
    const emailError = validateString(data.email, '电子邮件', {
      pattern: /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/
    });
    if (emailError) errors.email = emailError;
    
    // 抛出包含所有错误的异常
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('表单验证失败', errors);
    }
  }
  ```

### 3. 文档更新

- **记录已知的边缘情况**
  ```markdown
  ## 客户数据验证规则
  
  - **客户名称**:
    - 必填项
    - 不能仅包含空格
    - 长度：2-50个字符
    - 可以包含字母、数字、空格和基本标点符号
  
  - **电子邮件**:
    - 必填项
    - 必须是有效的电子邮件格式
    - 最大长度：255个字符
  
  ## 注意事项
  
  - 表单提交前，客户端会验证所有字段
  - 服务器端也会执行相同的验证逻辑
  - 特殊字符（如引号和破折号）在名称中是允许的，但会进行安全处理
  ```

### 4. 自动化改进

- **增加自动化测试**
  ```yaml
  # GitHub Actions 工作流配置
  name: Pull Request Tests
  
  on:
    pull_request:
      branches: [ main, develop ]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      
      steps:
        - uses: actions/checkout@v2
        
        - name: Setup Node.js
          uses: actions/setup-node@v2
          with:
            node-version: '18'
        
        - name: Install dependencies
          run: npm ci
        
        - name: Type check
          run: npm run type-check
          
        - name: Lint
          run: npm run lint
        
        - name: Unit tests
          run: npm run test
        
        - name: E2E tests
          run: npm run test:e2e
  ```

- **自动化静态分析**
  ```json
  // package.json
  {
    "scripts": {
      "lint": "eslint --ext .ts,.tsx src/",
      "lint:fix": "eslint --ext .ts,.tsx src/ --fix",
      "type-check": "tsc --noEmit",
      "pre-commit": "lint-staged"
    },
    "lint-staged": {
      "*.{ts,tsx}": [
        "eslint --fix",
        "prettier --write"
      ]
    }
  }
  ```

---

通过遵循本指南中的流程和最佳实践，CRM 系统的 bug 修复过程将更加高效、一致且可追踪。持续改进测试覆盖率和自动化流程，将有助于减少未来出现类似问题的可能性。
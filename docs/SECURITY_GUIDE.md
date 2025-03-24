# CRM 系统安全指南

本文档概述了保护 CRM 系统安全的全面方法，涵盖前端、API、数据和基础设施各层面的安全措施。遵循这些指南可以有效降低安全风险，保护敏感客户数据。

## 目录

1. [前端安全措施](#前端安全措施)
2. [API 安全措施](#api-安全措施)
3. [数据安全措施](#数据安全措施)
4. [基础设施安全](#基础设施安全)
5. [安全监控与响应](#安全监控与响应)

## 前端安全措施

### 防止 XSS 攻击

- **内容安全策略 (CSP)**
  ```html
  <!-- 在 HTML 头部添加 CSP -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;">
  ```

- **输入验证与输出编码**
  ```typescript
  // 在显示用户输入前进行编码
  import DOMPurify from 'dompurify';
  
  function safeDisplay(userInput: string): string {
    return DOMPurify.sanitize(userInput);
  }
  ```

- **React 安全实践**
  - 避免使用 `dangerouslySetInnerHTML`
  - 对于必须使用的情况，确保内容已经通过 DOMPurify 等库进行安全处理

### 防止 CSRF 攻击

- **使用 CSRF 令牌**
  ```typescript
  // 在每个表单中包含 CSRF 令牌
  const Form = () => {
    const [csrfToken, setCsrfToken] = useState('');
    
    useEffect(() => {
      // 从服务器获取 CSRF 令牌
      async function fetchToken() {
        const response = await fetch('/api/csrf-token');
        const data = await response.json();
        setCsrfToken(data.token);
      }
      fetchToken();
    }, []);
    
    return (
      <form method="post" action="/api/submit">
        <input type="hidden" name="csrf_token" value={csrfToken} />
        {/* 表单字段 */}
      </form>
    );
  };
  ```

- **实施 SameSite Cookie 策略**
  ```typescript
  // 在服务器端设置 Cookie
  res.setHeader('Set-Cookie', 'session=value; HttpOnly; Secure; SameSite=Strict');
  ```

### 安全的客户端存储

- **敏感数据处理**
  - 避免在本地存储中保存敏感信息
  - 加密必须存储的敏感数据

- **正确使用存储机制**
  ```typescript
  // 安全地使用 localStorage
  const secureStore = {
    set: (key: string, value: any) => {
      // 对敏感数据进行加密（使用加密库）
      localStorage.setItem(key, JSON.stringify(value));
    },
    get: (key: string) => {
      const value = localStorage.getItem(key);
      if (!value) return null;
      // 解密（如果已加密）
      return JSON.parse(value);
    },
    remove: (key: string) => {
      localStorage.removeItem(key);
    }
  };
  ```

### 安全的依赖管理

- **定期更新依赖项**
  ```bash
  # 检查过时或有漏洞的依赖项
  npm audit
  
  # 更新依赖项
  npm update
  
  # 修复安全漏洞
  npm audit fix
  ```

- **使用依赖锁定文件**
  - 确保使用 `package-lock.json` 或 `yarn.lock`

### 实施安全的 UI/UX

- **敏感操作二次确认**
  ```jsx
  // 删除操作确认对话框
  const ConfirmDelete = ({ onConfirm, onCancel }) => {
    return (
      <div className="confirm-dialog">
        <h3>确认删除？</h3>
        <p>此操作无法撤销。</p>
        <div className="actions">
          <button onClick={onCancel}>取消</button>
          <button onClick={onConfirm} className="danger">确认删除</button>
        </div>
      </div>
    );
  };
  ```

- **防暴力攻击措施**
  - 实施登录尝试限制
  - 使用 CAPTCHA 防止自动化攻击

## API 安全措施

### 身份验证与授权

- **实施 JWT 最佳实践**
  ```typescript
  // JWT 创建（服务器端）
  import jwt from 'jsonwebtoken';
  
  function generateToken(user) {
    // 使用短期有效期，并包含最少必要信息
    return jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
  
  // JWT 验证中间件
  function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: '未授权访问' });
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: '令牌已过期或无效' });
      req.user = user;
      next();
    });
  }
  ```

- **基于角色的访问控制**
  ```typescript
  // 权限检查中间件
  function checkPermission(requiredRole) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: '未授权访问' });
      }
      
      if (req.user.role !== requiredRole && req.user.role !== 'admin') {
        return res.status(403).json({ error: '没有足够权限' });
      }
      
      next();
    };
  }
  
  // 在路由中使用
  router.get('/admin/users', authenticateToken, checkPermission('admin'), (req, res) => {
    // 处理请求
  });
  ```

### API 输入验证

- **使用模式验证**
  ```typescript
  import { z } from 'zod';
  
  // 定义验证模式
  const userSchema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    age: z.number().int().positive().optional()
  });
  
  // 在 API 路由中使用
  router.post('/api/users', (req, res) => {
    try {
      const validatedData = userSchema.parse(req.body);
      // 处理验证通过的数据
    } catch (error) {
      return res.status(400).json({ error: '无效输入', details: error.issues });
    }
  });
  ```

- **净化用户输入**
  - 移除或转义潜在危险的字符和模式
  - 限制输入长度

### API 请求限速

- **实施速率限制**
  ```typescript
  import rateLimit from 'express-rate-limit';
  
  // 创建限速中间件
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 5, // 每个 IP 在窗口期内的最大请求数
    message: { error: '尝试次数过多，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // 应用于登录路由
  app.post('/api/login', loginLimiter, loginController);
  
  // 创建通用 API 限制
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    max: 100, // 每个 IP 每分钟最大请求数
    message: { error: '请求过于频繁，请稍后再试' },
  });
  
  // 应用于所有 API 路由
  app.use('/api/', apiLimiter);
  ```

### 安全的文件处理

- **文件上传验证**
  ```typescript
  import multer from 'multer';
  import path from 'path';
  
  // 配置文件存储和验证
  const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${path.extname(file.originalname)}`);
    }
  });
  
  // 文件过滤器
  const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = /jpeg|jpg|png|pdf/;
    // 检查文件扩展名
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    // 检查 MIME 类型
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('仅支持 JPEG、JPG、PNG 和 PDF 文件！'));
    }
  };
  
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter
  });
  
  // 在路由中使用
  router.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    // 处理文件上传
  });
  ```

- **安全的文件下载**
  ```typescript
  // 实施安全的文件下载
  router.get('/api/files/:id', authenticateToken, async (req, res) => {
    try {
      const file = await getFileById(req.params.id);
      
      // 检查用户是否有权限访问文件
      if (file.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: '没有权限访问此文件' });
      }
      
      // 设置内容处置头以增强安全性
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Type', file.mimetype);
      
      // 提供文件
      res.sendFile(path.resolve(file.path));
    } catch (error) {
      res.status(404).json({ error: '文件不存在' });
    }
  });
  ```

## 数据安全措施

### 数据加密

- **传输中的数据加密**
  - 使用 HTTPS/TLS 确保所有通信安全
  - 配置强密码套件和安全参数

- **静态数据加密**
  ```typescript
  import crypto from 'crypto';
  
  // 加密敏感字段
  function encryptData(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // 返回 IV + 加密数据 + 认证标签
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  }
  
  // 解密敏感字段
  function decryptData(encryptedText, key) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  ```

### 数据库安全

- **避免 SQL 注入**
  - 在使用 Prisma ORM 时，按照文档推荐的方式使用参数化查询
  - 避免直接构造或拼接 SQL 查询字符串

- **数据库用户权限最小化**
  - 为应用创建特定权限的数据库用户
  - 限制数据库用户只能访问必要的表和操作

- **敏感数据处理**
  ```typescript
  // Prisma 模型定义示例 - 安全存储密码
  model User {
    id        Int      @id @default(autoincrement())
    email     String   @unique
    password  String   // 存储哈希值，不是明文
    // 其他字段
  }
  
  // 密码哈希与验证
  import * as bcrypt from 'bcrypt';
  
  // 哈希密码
  async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
  
  // 验证密码
  async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
  
  // 用户创建示例
  async function createUser(email: string, password: string) {
    const hashedPassword = await hashPassword(password);
    
    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });
  }
  ```

### 数据删除与归档

- **安全数据删除**
  ```typescript
  // 软删除实现
  model Customer {
    id          Int       @id @default(autoincrement())
    name        String
    email       String
    isDeleted   Boolean   @default(false)
    deletedAt   DateTime?
    // 其他字段
  }
  
  // 软删除操作
  async function softDeleteCustomer(id: number) {
    return prisma.customer.update({
      where: { id },
      data: { 
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  }
  
  // 查询时过滤已删除记录
  async function getActiveCustomers() {
    return prisma.customer.findMany({
      where: { isDeleted: false }
    });
  }
  ```

- **数据留存政策**
  - 定义敏感数据的保留期限
  - 实施自动归档或删除过期数据的流程

### 数据备份

- **定期备份策略**
  - 实施自动定期备份
  - 存储备份在安全的、与生产环境隔离的位置
  - 对备份数据进行加密

- **备份测试与恢复**
  - 定期测试从备份恢复的流程
  - 记录恢复时间目标 (RTO) 和恢复点目标 (RPO)

## 基础设施安全

### 网络安全

- **防火墙与网络分段**
  - 实施网络防火墙保护生产环境
  - 采用网络分段隔离不同功能区域

- **安全头配置**
  ```typescript
  // 使用 helmet 中间件增强 HTTP 头安全性
  import helmet from 'helmet';
  
  // 应用基本安全头
  app.use(helmet());
  
  // 自定义 CSP 策略
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'trusted-cdn.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'trusted-cdn.com'],
        imgSrc: ["'self'", 'data:', 'trusted-cdn.com'],
        connectSrc: ["'self'", 'api.yourservice.com'],
        fontSrc: ["'self'", 'trusted-cdn.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    })
  );
  ```

### 服务器安全

- **定期更新与补丁**
  - 实施定期安全更新流程
  - 监控安全公告并及时应用关键补丁

- **强化操作系统安全**
  - 禁用不必要的服务和端口
  - 配置安全组或防火墙规则
  - 最小权限原则配置服务账户

### Docker 与容器安全

- **安全的容器配置**
  ```docker
  # Dockerfile 安全最佳实践
  FROM node:18-slim AS build
  
  # 使用非 root 用户
  RUN mkdir -p /app && chown -R node:node /app
  WORKDIR /app
  USER node
  
  # 复制依赖文件并安装依赖
  COPY --chown=node:node package*.json ./
  RUN npm ci --only=production
  
  # 复制应用代码
  COPY --chown=node:node . .
  
  # 使用多阶段构建减小镜像大小
  FROM node:18-slim
  USER node
  WORKDIR /app
  COPY --from=build --chown=node:node /app .
  
  # 设置安全相关环境变量
  ENV NODE_ENV=production
  
  # 运行应用
  CMD ["node", "server.js"]
  ```

- **容器编排安全**
  - 设置网络策略限制容器间通信
  - 使用密钥管理服务安全地提供密钥
  - 实施容器运行时监控

### 云服务安全

- **安全 IAM 配置**
  - 遵循最小权限原则分配权限
  - 使用角色而非共享凭证
  - 定期审核和轮换访问密钥

- **存储安全**
  - 确保云存储默认为私有访问
  - 对敏感数据实施服务器端加密
  - 审核和关闭不必要的公共访问权限

## 安全监控与响应

### 日志记录与监控

- **集中式日志管理**
  ```typescript
  // 配置结构化日志
  import winston from 'winston';
  
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'crm-service' },
    transports: [
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' }),
    ],
  });
  
  // 在生产环境之外，也在控制台打印日志
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.simple(),
    }));
  }
  
  // 记录敏感操作
  function logSecurityEvent(eventType, userId, details) {
    logger.info({
      message: 'Security event',
      eventType,
      userId,
      timestamp: new Date().toISOString(),
      details,
    });
  }
  
  // 使用示例
  app.post('/api/login', async (req, res) => {
    try {
      // 登录逻辑
      const user = await authenticateUser(req.body.email, req.body.password);
      
      // 记录成功登录
      logSecurityEvent('login_success', user.id, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({ token: generateToken(user) });
    } catch (error) {
      // 记录失败尝试
      logSecurityEvent('login_failure', null, {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        reason: error.message,
      });
      
      res.status(401).json({ error: '认证失败' });
    }
  });
  ```

- **安全警报配置**
  - 配置异常行为警报
  - 监控并警报异常登录尝试
  - 设置关键资源使用阈值警报

### 安全漏洞扫描

- **定期安全审计**
  - 使用代码扫描工具检测漏洞
  - 实施依赖项安全检查流程
  - 定期进行渗透测试

- **持续集成安全检查**
  ```yaml
  # GitHub Actions 安全检查配置示例
  name: Security Checks
  
  on:
    push:
      branches: [ main, develop ]
    pull_request:
      branches: [ main ]
  
  jobs:
    security:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v2
        
        - name: Setup Node.js
          uses: actions/setup-node@v2
          with:
            node-version: '18'
            
        - name: Install dependencies
          run: npm ci
          
        - name: Run dependency audit
          run: npm audit --production
          
        - name: Run SAST scan
          uses: github/codeql-action/analyze@v1
  ```

### 事件响应计划

- **制定安全事件响应流程**
  - 定义安全事件分类和严重性级别
  - 建立响应团队和沟通渠道
  - 记录处理步骤和上报流程

- **数据泄露响应**
  - 准备数据泄露通知模板
  - 了解并遵循相关法律法规要求
  - 建立用户通知流程

---

通过实施这些安全措施，CRM 系统可以有效防御常见威胁，保护敏感客户数据，并为用户提供安全的体验。安全是一个持续过程，应定期评估和更新安全措施，以应对不断演变的威胁环境。 
# CRM 系统性能优化指南

本文档提供了 CRM 系统性能优化的全面方法，涵盖前端、API、数据库和基础设施各个层面。

## 目录

1. [前端性能优化](#前端性能优化)
2. [API 性能优化](#api-性能优化)
3. [数据库性能优化](#数据库性能优化)
4. [基础设施优化](#基础设施优化)
5. [监控与持续优化](#监控与持续优化)

## 前端性能优化

### 代码分割与懒加载

- **实现路由级别的代码分割**：利用 Next.js 的动态导入特性，对各个页面路由进行代码分割
  ```jsx
  // 使用动态导入
  const DashboardPage = dynamic(() => import('@/components/DashboardPage'), {
    loading: () => <LoadingState />,
  });
  ```

- **组件懒加载**：对大型或不常用的组件实施懒加载
  ```jsx
  // 仅在需要时加载复杂的图表组件
  const ComplexChart = dynamic(() => import('@/components/ComplexChart'), {
    ssr: false, // 客户端渲染复杂图表
    loading: () => <SimpleLoadingIndicator />,
  });
  ```

### 资源优化

- **图片优化**
  - 使用 Next.js 的 Image 组件自动优化图片
  - 实施响应式图片策略，针对不同设备提供适当尺寸的图片
  - 优先使用 WebP 或 AVIF 等现代图片格式
  - 为图标使用 SVG 或图标字体

- **静态资源缓存策略**
  - 配置适当的缓存头信息
  - 对静态资源实施内容哈希，实现长期缓存
  - 优化第三方资源的加载

### 渲染优化

- **选择性使用 SSR/SSG/CSR**
  - 对内容密集型页面使用 SSG（静态生成）
  - 对需要最新数据的页面使用 SSR（服务器端渲染）
  - 对高交互性页面使用 CSR（客户端渲染）

- **减少主线程阻塞**
  - 长任务分解为较小的异步任务
  - 优先使用 `requestAnimationFrame` 和 `requestIdleCallback` 进行非关键操作
  - Web Workers 处理复杂计算

### React 性能优化

- **组件优化**
  - 使用 React.memo 避免不必要的重渲染
  - 合理使用 useMemo 和 useCallback 缓存计算结果和回调函数
  - 提取和拆分复杂组件

- **状态管理优化**
  - 选择性更新，避免全局状态大范围变动
  - 使用 useReducer 管理复杂状态逻辑
  - 利用上下文分割，减少不必要的重渲染

- **列表渲染优化**
  - 虚拟滚动实现长列表（使用 react-window 或 react-virtualized）
  - 分页加载数据
  - 为列表项使用稳定的键值

### 加载性能优化

- **关键渲染路径优化**
  - 内联关键 CSS
  - 预加载关键资源
  - 延迟加载非关键 JavaScript 和 CSS

- **预取与预连接**
  ```html
  <!-- 预取可能访问的页面 -->
  <link rel="prefetch" href="/dashboard" />
  <!-- 预连接将使用的域 -->
  <link rel="preconnect" href="https://api.example.com" />
  ```

- **优化首次内容绘制 (FCP)**
  - 减少阻塞渲染的资源
  - 简化关键渲染路径
  - 优化服务器响应时间

## API 性能优化

### 请求效率优化

- **实施数据聚合端点**：减少客户端的多次请求
  ```javascript
  // 单一端点返回仪表板所需的多种数据
  router.get('/api/dashboard', async (req, res) => {
    const [stats, recentTasks, notifications] = await Promise.all([
      getStats(),
      getRecentTasks(),
      getNotifications()
    ]);
    
    res.json({ stats, recentTasks, notifications });
  });
  ```

- **GraphQL 考虑**：允许客户端请求确切需要的数据
  - 实施字段级查询，减少过度获取
  - 使用数据加载器批处理和缓存查询

- **实施部分响应**：允许客户端指定所需字段
  ```javascript
  router.get('/api/customers', (req, res) => {
    const fields = req.query.fields?.split(',') || null;
    // 根据请求的字段筛选响应数据
  });
  ```

### 缓存策略

- **实现多层缓存**
  - 内存缓存 (Redis/Node.js 内存缓存)
  - HTTP 缓存 (使用适当的缓存控制头)
  - 数据库查询缓存

- **API 响应缓存**
  ```javascript
  // 使用内存缓存常用的 API 响应
  const cache = new Map();
  
  function getCachedData(key, ttl, fetchFunction) {
    const cached = cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    const data = await fetchFunction();
    cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
    
    return data;
  }
  ```

- **缓存失效策略**
  - 基于时间的自动失效
  - 基于事件的手动失效（数据更新时）

### 响应优化

- **压缩响应数据**
  - 启用 Gzip 或 Brotli 压缩
  - 使用 Next.js 的自动压缩或显式配置压缩中间件

- **减小 JSON 有效负载**
  - 仅发送必需字段
  - 使用紧凑的属性名
  - 考虑对超大响应使用流式传输

- **分页和限制响应大小**
  ```javascript
  router.get('/api/customers', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    // 实现分页逻辑
  });
  ```

### API 架构优化

- **批处理操作**：减少客户端-服务器往返
  - 支持批量创建/更新/删除操作
  - 实现复合查询

- **异步处理**：将长时间运行的操作移至后台
  - 对耗时操作使用任务队列
  - 实现轮询或 WebSocket 通知完成状态

- **请求限速**：防止滥用
  ```javascript
  // 使用速率限制中间件
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100 // 每个 IP 限制请求数
  });
  
  app.use('/api/', limiter);
  ```

## 数据库性能优化

### 查询优化

- **索引优化**
  - 为经常查询的字段创建索引
  - 创建复合索引优化多字段查询
  - 定期分析和优化索引使用情况

- **查询语句优化**
  - 只选择必需字段，避免 `SELECT *`
  - 利用 `EXPLAIN` 分析查询计划
  - 优化 JOIN 操作，减少连接表数量

- **使用 Prisma 查询优化**
  ```javascript
  // 优化：只选择必需字段
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true
    }
  });
  
  // 优化：使用 include 预加载关系
  const tasks = await prisma.task.findMany({
    include: {
      assignee: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  ```

### 数据库结构优化

- **规范化与反规范化平衡**
  - 对频繁更新的数据进行规范化
  - 对频繁查询的数据考虑适度反规范化

- **适当的数据类型选择**
  - 使用尽可能小的数据类型
  - 使用 ENUM 替代字符串存储有限的选项

- **分区与分表策略**
  - 对大表考虑水平分区
  - 基于日期或范围的分区策略

### 数据库操作优化

- **批量操作**
  ```javascript
  // 优化：批量插入而不是循环单个插入
  await prisma.notification.createMany({
    data: notificationsData,
    skipDuplicates: true,
  });
  ```

- **事务管理**
  ```javascript
  // 使用事务确保多操作的原子性
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({ /* ... */ });
    await tx.notification.create({ /* ... */ });
    await tx.activity.create({ /* ... */ });
  });
  ```

- **连接池配置**
  - 优化最小/最大连接数
  - 配置适当的连接超时

### 扩展策略

- **读写分离**
  - 主库处理写操作
  - 从库处理读操作

- **缓存层与数据库协作**
  - 实现缓存预热策略
  - 配置适当的缓存失效机制

- **数据归档策略**
  - 历史数据归档到单独的表或数据库
  - 实施数据留存策略

## 基础设施优化

### 服务器优化

- **资源分配**
  - 适当的 CPU/内存分配
  - 资源使用监控和自动扩展

- **Node.js 优化**
  - 使用集群模式充分利用多核 CPU
  - 优化 Node.js 内存限制和垃圾回收
  - 使用 PM2 进行进程管理和自动重启

- **环境配置**
  ```javascript
  // 在生产环境中启用 NODE_ENV=production
  if (process.env.NODE_ENV === 'production') {
    // 生产环境特定优化
  }
  ```

### 网络优化

- **CDN 使用**
  - 通过 CDN 提供静态资源
  - 考虑使用边缘缓存动态内容

- **DNS 预解析**
  ```html
  <link rel="dns-prefetch" href="//api.example.com">
  ```

- **HTTP/2 和 HTTP/3**
  - 启用多路复用
  - 头部压缩
  - 服务器推送关键资源

### 部署优化

- **容器化部署**
  - 优化 Docker 镜像大小
  - 合理配置容器资源限制

- **无服务器架构考虑**
  - 使用 Vercel 或 AWS Lambda 实现自动扩展
  - 优化冷启动时间

- **构建优化**
  - 利用构建缓存
  - 优化依赖管理
  - 实施静态资产最小化

## 监控与持续优化

### 性能监控

- **前端监控**
  - Web Vitals (LCP, FID, CLS 等)
  - 用户交互延迟
  - JavaScript 错误率

- **后端监控**
  - API 响应时间
  - 吞吐量和错误率
  - 资源使用情况

- **数据库监控**
  - 查询性能
  - 连接使用情况
  - 锁和等待事件

### 实施日志记录和分析

- **集中式日志管理**
  ```javascript
  // 增强的日志记录，包含性能信息
  logger.info('API 请求已处理', {
    endpoint: '/api/customers',
    duration: `${endTime - startTime}ms`,
    requestSize: requestSize,
    responseSize: responseSize
  });
  ```

- **性能分析工具**
  - 使用 Lighthouse 和 Chrome DevTools
  - 集成 New Relic 或 Datadog 等 APM 解决方案

### 基准测试与压力测试

- **定期基准测试**
  - 为关键路径建立性能基准
  - 监测每次发布的性能变化

- **负载测试**
  - 使用 k6 或 Apache JMeter 进行压力测试
  - 确定系统的瓶颈和断点

### 持续优化策略

- **性能预算**
  - 建立关键指标的性能预算
  - 在 CI/CD 流程中自动验证

- **A/B 测试性能改进**
  - 对重大性能更改进行分阶段推出
  - 衡量和验证实际用户影响

- **优化反馈循环**
  - 建立从监控到改进的清晰路径
  - 设置性能警报和定期审查

---

通过系统地应用这些优化策略，可以显著提高 CRM 系统的性能和响应能力。优化应该是持续的过程，基于实际用户体验和系统数据进行调整。优先考虑对用户体验影响最大的优化措施，并确保所有优化都经过彻底测试，以避免引入新问题。 
/**
 * 日志系统
 * 用于统一管理应用程序日志
 */
import { prisma } from './prisma';

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// 当前日志级别 - 可通过环境变量配置
const currentLogLevel = process.env.LOG_LEVEL 
  ? parseInt(process.env.LOG_LEVEL) 
  : LogLevel.INFO;

// 是否将日志发送到数据库
const logToDatabase = process.env.LOG_TO_DATABASE === 'true';

// 最大日志队列大小
const MAX_LOG_QUEUE = 100;

// 日志队列 - 用于批量写入数据库
const logQueue: {level: LogLevel, message: string, meta?: any}[] = [];

// 是否正在处理队列
let isProcessingQueue = false;

/**
 * 格式化日志消息
 */
function formatLog(level: string, message: string, meta?: any): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

/**
 * 处理日志队列，将日志写入数据库
 */
async function processLogQueue() {
  if (isProcessingQueue || logQueue.length === 0) return;
  isProcessingQueue = true;
  
  try {
    // 取出队列中的日志（最多50条）
    const logs = logQueue.splice(0, 50);
    
    if (logs.length > 0 && logToDatabase) {
      // 批量创建日志记录
      await prisma.systemLog.createMany({
        data: logs.map(log => ({
          level: LogLevel[log.level],
          message: log.message,
          details: log.meta ? JSON.stringify(log.meta) : null,
          timestamp: new Date()
        })),
        skipDuplicates: false
      });
    }
  } catch (error) {
    console.error('Failed to write logs to database:', error);
  } finally {
    isProcessingQueue = false;
    
    // 如果队列中还有日志，继续处理
    if (logQueue.length > 0) {
      setTimeout(processLogQueue, 0);
    }
  }
}

/**
 * 记录日志
 */
function log(level: LogLevel, message: string, meta?: any) {
  // 判断是否需要记录该级别的日志
  if (level < currentLogLevel) return;
  
  // 根据日志级别获取级别名称
  const levelName = LogLevel[level];
  
  // 格式化并输出日志
  const formattedLog = formatLog(levelName, message, meta);
  
  // 根据级别使用不同的控制台方法
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(formattedLog);
      break;
    case LogLevel.INFO:
      console.info(formattedLog);
      break;
    case LogLevel.WARN:
      console.warn(formattedLog);
      break;
    case LogLevel.ERROR:
    case LogLevel.FATAL:
      console.error(formattedLog);
      break;
  }
  
  // 如果配置了数据库日志，将日志添加到队列
  if (logToDatabase && level >= LogLevel.INFO) {
    logQueue.push({ level, message, meta });
    
    // 如果队列已满或者是高级别日志，立即处理
    if (logQueue.length >= MAX_LOG_QUEUE || level >= LogLevel.ERROR) {
      processLogQueue();
    }
  }
}

/**
 * 定期处理日志队列（每30秒）
 */
setInterval(processLogQueue, 30000);

/**
 * 记录API请求日志
 */
export function logApiRequest(req: Request, duration: number, statusCode: number) {
  const url = new URL(req.url);
  const meta = {
    method: req.method,
    path: url.pathname,
    query: url.search,
    statusCode,
    duration: `${duration.toFixed(2)}ms`,
    userAgent: req.headers.get('user-agent') || 'unknown'
  };
  
  const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
  const message = `API ${req.method} ${url.pathname} - ${statusCode} (${duration.toFixed(2)}ms)`;
  
  log(level, message, meta);
  
  // 记录慢请求
  if (duration > 1000) {
    log(LogLevel.WARN, `Slow API request: ${message}`, meta);
  }
}

// 导出日志记录方法
export const logger = {
  debug: (message: string, meta?: any) => log(LogLevel.DEBUG, message, meta),
  info: (message: string, meta?: any) => log(LogLevel.INFO, message, meta),
  warn: (message: string, meta?: any) => log(LogLevel.WARN, message, meta),
  error: (message: string, meta?: any) => log(LogLevel.ERROR, message, meta),
  fatal: (message: string, meta?: any) => log(LogLevel.FATAL, message, meta),
  
  // 特定场景日志
  api: logApiRequest,
  
  // 记录数据库操作
  db: (operation: string, model: string, duration: number, meta?: any) => {
    const message = `DB ${operation} ${model} (${duration.toFixed(2)}ms)`;
    const level = duration > 500 ? LogLevel.WARN : LogLevel.DEBUG;
    log(level, message, meta);
  }
}; 
/**
 * 结构化日志系统
 * 支持不同日志级别和请求追踪
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  duration?: number;
  meta?: Record<string, any>;
}

class Logger {
  private formatMessage(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
    ];
    
    if (entry.requestId) {
      parts.push(`[req:${entry.requestId}]`);
    }
    
    if (entry.userId) {
      parts.push(`[user:${entry.userId}]`);
    }
    
    parts.push(entry.message);
    
    if (entry.meta) {
      parts.push(JSON.stringify(entry.meta));
    }
    
    return parts.join(' ');
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (meta) {
      if (meta.requestId) entry.requestId = meta.requestId;
      if (meta.userId) entry.userId = meta.userId;
      if (meta.duration) entry.duration = meta.duration;
      if (meta.meta) entry.meta = meta.meta;
    }

    const formatted = this.formatMessage(entry);
    
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
    }
  }

  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  // 请求日志
  request(requestId: string, method: string, path: string, userId?: string) {
    this.info(`${method} ${path}`, { requestId, userId });
  }

  // 响应日志
  response(requestId: string, statusCode: number, duration: number, userId?: string) {
    this.info(`Response ${statusCode} (${duration}ms)`, { requestId, userId, duration });
  }

  // 错误日志
  errorWithRequest(requestId: string, error: Error, userId?: string) {
    this.error(error.message, {
      requestId,
      userId,
      stack: error.stack,
      name: error.name,
    });
  }
}

export const logger = new Logger();

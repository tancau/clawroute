/**
 * 全局错误处理中间件
 * 统一错误响应格式
 */

import { Context } from 'hono';
import { logger } from './logger';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// 预定义错误类型
export const Errors = {
  BadRequest: (message: string, details?: any) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  Unauthorized: (message: string = 'Unauthorized') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  Forbidden: (message: string = 'Forbidden') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  NotFound: (resource: string) => 
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  
  Conflict: (message: string) => 
    new AppError(message, 409, 'CONFLICT'),
  
  ValidationError: (details: any) => 
    new AppError('Validation failed', 422, 'VALIDATION_ERROR', details),
  
  Internal: (message: string = 'Internal server error') => 
    new AppError(message, 500, 'INTERNAL_ERROR'),
};

/**
 * 错误处理中间件
 */
export function errorHandler(err: Error | AppError, c: Context) {
  const requestId = c.req.header('x-request-id') || 'unknown';
  // const userId = c.get('user')?.id;

  // 记录错误日志
  if (err instanceof AppError) {
    logger.errorWithRequest(requestId, err);
  } else {
    logger.errorWithRequest(requestId, err);
  }

  // 构建错误响应
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
  const details = err instanceof AppError ? err.details : undefined;

  // 生产环境不暴露内部错误详情
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  return c.json({
    error: {
      code,
      message,
      requestId,
      ...(details && { details }),
    },
  }, statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500);
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(c: Context) {
  const requestId = c.req.header('x-request-id') || 'unknown';
  
  logger.warn(`Route not found: ${c.req.method} ${c.req.path}`, { requestId });
  
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      requestId,
    },
  }, 404);
}

/**
 * 异步路由包装器 - 自动捕获错误
 * 注意：Hono 已经有内置的错误处理，这个函数主要用于额外的日志记录
 */
export function asyncHandler(
  fn: (c: Context) => Promise<any>
) {
  return fn; // Hono 会自动处理 Promise rejection
}

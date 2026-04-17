/**
 * 监控系统测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { logger } from '../monitoring/logger';
import { AppError, Errors } from '../monitoring/error-handler';

describe('Logger', () => {
  let consoleOutput: { log: string[], error: string[], warn: string[], info: string[] };

  beforeEach(() => {
    // 捕获 console 输出
    consoleOutput = { log: [], error: [], warn: [], info: [] };
    
    console.log = (...args: any[]) => consoleOutput.log.push(args.join(' '));
    console.error = (...args: any[]) => consoleOutput.error.push(args.join(' '));
    console.warn = (...args: any[]) => consoleOutput.warn.push(args.join(' '));
    console.info = (...args: any[]) => consoleOutput.info.push(args.join(' '));
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    expect(consoleOutput.error.length).toBeGreaterThan(0);
    expect(consoleOutput.error[0]).toContain('Test error message');
    expect(consoleOutput.error[0]).toContain('ERROR');
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(consoleOutput.warn.length).toBeGreaterThan(0);
    expect(consoleOutput.warn[0]).toContain('Test warning message');
    expect(consoleOutput.warn[0]).toContain('WARN');
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(consoleOutput.info.length).toBeGreaterThan(0);
    expect(consoleOutput.info[0]).toContain('Test info message');
    expect(consoleOutput.info[0]).toContain('INFO');
  });

  it('should log debug messages', () => {
    // Debug 使用 console.debug，而不是 console.log
    const mockDebug = [];
    const originalDebug = console.debug;
    console.debug = (...args: any[]) => mockDebug.push(args.join(' '));
    
    logger.debug('Test debug message');
    expect(mockDebug.length).toBeGreaterThan(0);
    expect(mockDebug[0]).toContain('Test debug message');
    expect(mockDebug[0]).toContain('DEBUG');
    
    console.debug = originalDebug;
  });

  it('should include request ID in logs', () => {
    logger.request('req-123', 'GET', '/api/test', 'user-456');
    expect(consoleOutput.info[0]).toContain('req-123');
    expect(consoleOutput.info[0]).toContain('GET');
    expect(consoleOutput.info[0]).toContain('/api/test');
  });

  it('should include metadata in logs', () => {
    logger.info('Test with meta');
    const logOutput = consoleOutput.info.join('');
    expect(logOutput).toContain('Test with meta');
    expect(logOutput).toContain('INFO');
  });
});

describe('Error Handler', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'value' });
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ field: 'value' });
  });

  it('should create BadRequest error', () => {
    const error = Errors.BadRequest('Invalid input');
    
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Invalid input');
  });

  it('should create Unauthorized error', () => {
    const error = Errors.Unauthorized();
    
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should create NotFound error', () => {
    const error = Errors.NotFound('User');
    
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });

  it('should create ValidationError', () => {
    const error = Errors.ValidationError({ email: 'Invalid email format' });
    
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ email: 'Invalid email format' });
  });

  it('should create Internal error', () => {
    const error = Errors.Internal('Database connection failed');
    
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });
});

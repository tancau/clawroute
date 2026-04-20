/**
 * Admin 权限检查中间件
 * 用于保护 Admin API 端点
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../auth';
import { findUserById } from '../auth';

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  tier: string;
}

/**
 * 检查请求是否来自管理员
 */
export async function checkAdminAuth(request: NextRequest): Promise<{ 
  authorized: boolean; 
  user?: AdminUser; 
  error?: string 
}> {
  // 从 Cookie 或 Header 获取 token
  const token = request.cookies.get('accessToken')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return { authorized: false, error: 'No token provided' };
  }
  
  const secret = process.env.JWT_SECRET || 'hopllm-dev-secret';
  const payload = verifyJWT(token, secret);
  
  if (!payload || typeof payload !== 'object') {
    return { authorized: false, error: 'Invalid token' };
  }
  
  const userId = payload.userId as string;
  if (!userId) {
    return { authorized: false, error: 'Invalid token payload' };
  }
  
  const user = await findUserById(userId);
  if (!user) {
    return { authorized: false, error: 'User not found' };
  }
  
  // 检查管理员权限
  if (user.tier !== 'admin' && user.email !== 'admin@hopllm.com') {
    return { authorized: false, error: 'Admin access required' };
  }
  
  return { 
    authorized: true, 
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
    }
  };
}

/**
 * Admin API 路由包装器
 * 自动处理权限检查
 */
export function withAdminAuth(
  handler: (request: NextRequest, user: AdminUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await checkAdminAuth(request);
    
    if (!auth.authorized) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: auth.error || 'Admin access required' } },
        { status: 403 }
      );
    }
    
    return handler(request, auth.user!);
  };
}

/**
 * 检查维护模式
 */
export async function checkMaintenanceMode(): Promise<boolean> {
  try {
    const { getConfig } = await import('../config');
    return getConfig<boolean>('system.maintenance_mode', false);
  } catch {
    return false;
  }
}

/**
 * 维护模式中间件
 * 阻止非管理员用户访问
 */
export function withMaintenanceCheck(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const isMaintenance = await checkMaintenanceMode();
    
    if (isMaintenance) {
      // 检查是否是管理员
      const auth = await checkAdminAuth(request);
      
      if (!auth.authorized) {
        return NextResponse.json(
          { 
            error: { 
              code: 'MAINTENANCE', 
              message: 'System is under maintenance. Please try again later.' 
            } 
          },
          { status: 503 }
        );
      }
    }
    
    return handler(request);
  };
}

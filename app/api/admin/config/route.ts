/**
 * Admin 配置 API
 * GET /api/admin/config - 获取所有配置
 * PUT /api/admin/config - 更新配置
 * POST /api/admin/config/reset - 重置为默认值
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { findUserById } from '@/lib/auth';
import {
  getConfigGroups,
  getAllConfigs,
  setConfig,
  setConfigs,
  resetConfigDefaults,
  initConfigSystem,
} from '@/lib/config';

// Admin 权限检查
async function checkAdminAuth(request: NextRequest): Promise<{ authorized: boolean; userId?: string; error?: string }> {
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
  
  return { authorized: true, userId };
}

// GET - 获取所有配置
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }
  
  try {
    // 确保配置系统已初始化
    await initConfigSystem();
    
    // 获取配置分组
    const groups = await getConfigGroups();
    
    // 也提供扁平格式
    const flat = await getAllConfigs();
    
    return NextResponse.json({
      success: true,
      data: {
        groups,
        flat,
      },
    });
  } catch (error) {
    console.error('Failed to get configs:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get configs' } },
      { status: 500 }
    );
  }
}

// PUT - 更新配置
export async function PUT(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    
    if (!body.configs || !Array.isArray(body.configs)) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
        { status: 400 }
      );
    }
    
    // 验证配置项
    for (const config of body.configs) {
      if (!config.key || config.value === undefined) {
        return NextResponse.json(
          { error: { code: 'BAD_REQUEST', message: 'Each config must have key and value' } },
          { status: 400 }
        );
      }
    }
    
    // 批量更新
    await setConfigs(body.configs, auth.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Configs updated successfully',
    });
  } catch (error) {
    console.error('Failed to update configs:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update configs' } },
      { status: 500 }
    );
  }
}

// POST - 重置为默认值
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);
  
  if (!auth.authorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    
    if (body.action === 'reset') {
      await resetConfigDefaults(auth.userId);
      
      return NextResponse.json({
        success: true,
        message: 'Configs reset to defaults',
      });
    }
    
    // 单个配置更新
    if (body.key && body.value !== undefined) {
      await setConfig(body.key, body.value, auth.userId);
      
      return NextResponse.json({
        success: true,
        message: 'Config updated successfully',
      });
    }
    
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid action' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process config action:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process action' } },
      { status: 500 }
    );
  }
}

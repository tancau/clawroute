/**
 * POST /api/admin/sync
 * 手动触发模型目录同步（从 OpenRouter 等数据源）
 * GET /api/admin/sync/status
 * 获取同步状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, getJWTSecret } from '@/lib/auth';

interface SyncResult {
  source: string;
  modelsFound: number;
  modelsAdded: number;
  modelsUpdated: number;
  priceChanges: number;
  durationMs: number;
  error?: string;
}

// 简单的内存状态（生产环境应使用 Redis 或数据库）
let lastSyncTime: number | null = null;
let syncInProgress = false;

async function checkAdminAuth(request: NextRequest): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const token = request.cookies.get('accessToken')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return { authorized: false, error: 'No token provided' };
  }

  try {
    const secret = getJWTSecret();
    const payload = await verifyJWT(token, secret);

    if (!payload || typeof payload !== 'object' || !payload.userId) {
      return { authorized: false, error: 'Invalid token' };
    }

    return { authorized: true, userId: payload.userId as string };
  } catch {
    return { authorized: false, error: 'Token verification failed' };
  }
}

// GET - 获取同步状态
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      lastSyncTime,
      syncInProgress,
      nextScheduledSync: lastSyncTime ? lastSyncTime + 6 * 60 * 60 * 1000 : null,
    },
  });
}

// POST - 触发同步
export async function POST(request: NextRequest) {
  const auth = await checkAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }

  if (syncInProgress) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'Sync already in progress' } },
      { status: 409 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const syncType = body.type || 'prices'; // 'prices' | 'models' | 'full'

    syncInProgress = true;
    const startTime = Date.now();

    const results: SyncResult[] = [];

    if (syncType === 'prices' || syncType === 'full') {
      results.push(await syncPrices());
    }

    if (syncType === 'models' || syncType === 'full') {
      results.push(await syncModels());
    }

    lastSyncTime = Date.now();
    syncInProgress = false;

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        syncType,
        results,
        totalDuration,
        timestamp: lastSyncTime,
      },
    });
  } catch (error: unknown) {
    syncInProgress = false;
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}

/**
 * 从 OpenRouter 同步价格
 */
async function syncPrices(): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'HTTP-Referer': 'https://hopllm.com',
        'X-Title': 'HopLLM',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models = data.data || [];

    // 统计变更
    const priceChanges = 0;

    // 这里可以添加将数据写入数据库的逻辑
    // 目前先记录日志
    console.log(`[Sync] Fetched ${models.length} models from OpenRouter`);

    return {
      source: 'openrouter',
      modelsFound: models.length,
      modelsAdded: 0,
      modelsUpdated: 0,
      priceChanges,
      durationMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      source: 'openrouter',
      modelsFound: 0,
      modelsAdded: 0,
      modelsUpdated: 0,
      priceChanges: 0,
      durationMs: Date.now() - startTime,
      error: message,
    };
  }
}

/**
 * 同步完整模型列表
 */
async function syncModels(): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // 可以扩展为从多个数据源同步
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'HTTP-Referer': 'https://hopllm.com',
        'X-Title': 'HopLLM',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models = data.data || [];

    console.log(`[Sync] Full sync: ${models.length} models from OpenRouter`);

    return {
      source: 'openrouter-full',
      modelsFound: models.length,
      modelsAdded: 0,
      modelsUpdated: 0,
      priceChanges: 0,
      durationMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      source: 'openrouter-full',
      modelsFound: 0,
      modelsAdded: 0,
      modelsUpdated: 0,
      priceChanges: 0,
      durationMs: Date.now() - startTime,
      error: message,
    };
  }
}

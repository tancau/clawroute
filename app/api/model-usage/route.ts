/**
 * POST /api/model-usage
 * 
 * 记录模型使用数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { logModelUsage } from '@/lib/db/model-usage';

interface ModelUsageRequest {
  modelId: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: ModelUsageRequest = await request.json();

    // 验证必填字段
    if (!body.modelId || !body.taskType) {
      return NextResponse.json(
        { error: 'modelId and taskType are required' },
        { status: 400 }
      );
    }

    // 从请求头获取用户信息
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    // 生成记录 ID
    const id = `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 记录使用（异步，不阻塞）
    logModelUsage({
      id,
      userId: apiKey || 'anonymous',
      modelId: body.modelId,
      taskType: body.taskType,
      inputTokens: body.inputTokens || 0,
      outputTokens: body.outputTokens || 0,
      cost: body.cost || 0,
      latencyMs: body.latencyMs || 0,
      success: body.success !== false,
    }).catch(err => {
      console.error('[model-usage] Async log failed:', err);
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[model-usage] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record usage' },
      { status: 500 }
    );
  }
}

// CORS 支持
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/dashboard/top-models
 * 返回用户最常使用的模型
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { verifyJWT, getJWTSecret } from '@/lib/auth';

interface TopModel {
  model: string;
  requests: number;
  totalTokens: number;
  totalCostCents: number;
  totalCostDollars: number;
}

export async function GET(request: NextRequest) {
  try {
    // 验证 JWT
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token, getJWTSecret());
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // 按模型聚合
    const result = await db`
      SELECT 
        model,
        COUNT(*) as requests,
        COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
        COALESCE(SUM(cost_usd), 0) as total_cost
      FROM request_logs 
      WHERE user_id = ${userId}
      GROUP BY model
      ORDER BY requests DESC
      LIMIT ${limit}
    `;

    const models: TopModel[] = result.rows.map(row => ({
      model: row.model as string,
      requests: parseInt(row.requests as string) || 0,
      totalTokens: parseInt(row.total_tokens as string) || 0,
      totalCostCents: Math.round((parseFloat(row.total_cost as string) || 0) * 100),
      totalCostDollars: parseFloat(row.total_cost as string) || 0,
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        userId,
        models,
      }
    });
  } catch (error) {
    console.error('[Dashboard Top Models] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

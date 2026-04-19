/**
 * GET /api/dashboard/intents
 * 返回意图分类统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';

interface IntentStats {
  intent: string;
  requests: number;
  tokens: number;
  cost: number;
  percentage: number;
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

    const payload = verifyJWT(token, process.env.JWT_SECRET || 'clawrouter-dev-secret');
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    // 按意图聚合
    const result = await sql`
      SELECT 
        COALESCE(intent, 'unknown') as intent,
        COUNT(*) as requests,
        COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
        COALESCE(SUM(cost_usd), 0) as cost
      FROM request_logs 
      WHERE user_id = ${userId}
      GROUP BY intent
      ORDER BY requests DESC
    `;

    // 计算总数
    const totalResult = await sql`
      SELECT COUNT(*) as total FROM request_logs WHERE user_id = ${userId}
    `;
    const total = parseInt(totalResult.rows[0]?.total as string) || 1;

    const intents: IntentStats[] = result.rows.map(row => ({
      intent: row.intent as string,
      requests: parseInt(row.requests as string) || 0,
      tokens: parseInt(row.tokens as string) || 0,
      cost: parseFloat(row.cost as string) || 0,
      percentage: Math.round((parseInt(row.requests as string) || 0) / total * 100),
    }));

    return NextResponse.json({ success: true, data: intents });
  } catch (error) {
    console.error('[Dashboard Intents] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dashboard/recent
 * 返回用户最近的请求记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';

interface RecentRequest {
  id: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costCents: number;
  costDollars: number;
  timestamp: number;
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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // 获取最近请求
    const result = await sql`
      SELECT 
        id,
        model,
        provider,
        input_tokens,
        output_tokens,
        (input_tokens + output_tokens) as total_tokens,
        cost_usd,
        created_at
      FROM request_logs 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const requests: RecentRequest[] = result.rows.map(row => ({
      id: row.id as string,
      model: row.model as string,
      provider: row.provider as string,
      inputTokens: row.input_tokens as number || 0,
      outputTokens: row.output_tokens as number || 0,
      totalTokens: (row.total_tokens as number) || 0,
      costCents: Math.round((parseFloat(row.cost_usd as string) || 0) * 100),
      costDollars: parseFloat(row.cost_usd as string) || 0,
      timestamp: row.created_at as number,
    }));

    return NextResponse.json({ 
      success: true, 
      data: {
        userId,
        requests,
      }
    });
  } catch (error) {
    console.error('[Dashboard Recent] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

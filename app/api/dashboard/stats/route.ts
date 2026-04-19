/**
 * GET /api/dashboard/stats
 * 返回用户统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';

interface StatsResponse {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  totalSaved: number;
  credits: number;
  tier: string;
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

    // 获取用户信息
    const userResult = await sql`
      SELECT tier, credits FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0]!;

    // 获取统计数据（最近30天）
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
        COALESCE(SUM(cost_usd), 0) as total_cost
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${thirtyDaysAgo}
    `;

    const stats = statsResult.rows[0]!;

    // 计算节省金额（假设使用 HopLLM 比直接调用节省 70%）
    const totalCost = parseFloat(stats.total_cost as string) || 0;
    const totalSaved = totalCost * 0.7;

    const response: StatsResponse = {
      totalRequests: parseInt(stats.total_requests as string) || 0,
      totalTokens: parseInt(stats.total_tokens as string) || 0,
      totalCost,
      totalSaved,
      credits: user.credits as number,
      tier: user.tier as string,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

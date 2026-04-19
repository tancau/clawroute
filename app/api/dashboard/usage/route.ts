/**
 * GET /api/dashboard/usage
 * 返回使用趋势数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';

interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
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
    const days = parseInt(searchParams.get('days') || '7');

    // 计算起始时间
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // 按天聚合数据
    const result = await sql`
      SELECT 
        DATE(TO_TIMESTAMP(created_at / 1000)) as day,
        COUNT(*) as requests,
        COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
        COALESCE(SUM(cost_usd), 0) as cost
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${startTime}
      GROUP BY DATE(TO_TIMESTAMP(created_at / 1000))
      ORDER BY day DESC
      LIMIT ${days}
    `;

    // 格式化响应
    const usage: DailyUsage[] = result.rows.map(row => ({
      date: (row.day as Date).toISOString().split('T')[0] || '',
      requests: parseInt(row.requests as string) || 0,
      tokens: parseInt(row.tokens as string) || 0,
      cost: parseFloat(row.cost as string) || 0,
    }));

    // 填充缺失的日期
    const usageMap = new Map(usage.map(u => [u.date, u]));
    const filledUsage: DailyUsage[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (dateStr) {
        filledUsage.push(usageMap.get(dateStr) || {
          date: dateStr,
          requests: 0,
          tokens: 0,
          cost: 0,
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        period: { days },
        usage: filledUsage.reverse(),
      }
    });
  } catch (error) {
    console.error('[Dashboard Usage] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

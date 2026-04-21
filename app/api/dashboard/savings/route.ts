/**
 * GET /api/dashboard/savings
 * 返回用户节省金额统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';

interface SavingsResponse {
  userId: string;
  totalSavedCents: number;
  totalSavedDollars: number;
  averageSavedPercent: number;
  daily: Array<{
    date: string;
    savedCents: number;
    requests: number;
    costCents: number;
  }>;
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
    const days = parseInt(searchParams.get('days') || '30');

    // 计算起始时间
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // 获取总体节省金额
    const totalResult = await sql`
      SELECT 
        COALESCE(SUM(cost_usd), 0) as total_cost
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${startTime}
    `;

    const totalCost = parseFloat(totalResult.rows[0]?.total_cost as string) || 0;
    // 假设使用 HopLLM 比直接调用节省 70%
    const totalSavedCents = Math.round(totalCost * 0.7 * 100);
    const averageSavedPercent = 70;

    // 按天聚合数据
    const dailyResult = await sql`
      SELECT 
        DATE(TO_TIMESTAMP(created_at / 1000)) as day,
        COUNT(*) as requests,
        COALESCE(SUM(cost_usd), 0) as cost
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${startTime}
      GROUP BY DATE(TO_TIMESTAMP(created_at / 1000))
      ORDER BY day DESC
      LIMIT ${days}
    `;

    // 格式化每日数据
    const daily = dailyResult.rows.map(row => {
      const costCents = Math.round((parseFloat(row.cost as string) || 0) * 100);
      return {
        date: (row.day as Date).toISOString().split('T')[0] || '',
        savedCents: Math.round(costCents * 0.7),
        requests: parseInt(row.requests as string) || 0,
        costCents,
      };
    });

    // 填充缺失的日期
    const dailyMap = new Map(daily.map(d => [d.date, d]));
    const filledDaily: SavingsResponse['daily'] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (dateStr) {
        filledDaily.push(dailyMap.get(dateStr) || {
          date: dateStr,
          savedCents: 0,
          requests: 0,
          costCents: 0,
        });
      }
    }

    const response: SavingsResponse = {
      userId,
      totalSavedCents,
      totalSavedDollars: totalSavedCents / 100,
      averageSavedPercent,
      daily: filledDaily.reverse(),
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('[Dashboard Savings] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dashboard/savings
 * 返回用户节省金额统计
 * 
 * 节省计算逻辑：
 * - 对比 HopLLM 路由选择的模型成本 vs 使用 GPT-5.5 的成本
 * - 如果模型成本为 0（免费模型），节省 = GPT-5.5 的成本
 * - 如果模型有成本，按实际成本差异计算
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT, getJWTSecret } from '@/lib/auth';
import { calculateRequestCost } from '@/lib/routing/providers';

// 检查 PostgreSQL 是否可用
async function isPostgresAvailable(): Promise<boolean> {
  try {
    const { sql } = await import('@vercel/postgres');
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

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

    const payload = verifyJWT(token, getJWTSecret());
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

    // 检查数据库是否可用
    const dbAvailable = await isPostgresAvailable();
    if (!dbAvailable) {
      // 数据库不可用时返回空数据
      const emptyDaily: Array<{ date: string; savedCents: number; requests: number; costCents: number }> = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr) {
          emptyDaily.push({ date: dateStr, savedCents: 0, requests: 0, costCents: 0 });
        }
      }
      const response: SavingsResponse = {
        userId,
        totalSavedCents: 0,
        totalSavedDollars: 0,
        averageSavedPercent: 0,
        daily: emptyDaily.reverse(),
      };
      return NextResponse.json({ success: true, data: response });
    }

    // 计算起始时间
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // 获取总体成本
    const totalResult = await sql`
      SELECT 
        COALESCE(SUM(cost_usd), 0) as total_cost
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${startTime}
    `;

    const totalCost = parseFloat(totalResult.rows[0]?.total_cost as string) || 0;
    
    // 获取按模型聚合的请求数据，计算真实节省金额
    const modelBreakdown = await sql`
      SELECT 
        model,
        COALESCE(SUM(input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(output_tokens), 0) as total_output_tokens,
        COALESCE(SUM(cost_usd), 0) as total_cost
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${startTime}
      GROUP BY model
    `;

    // 计算真实节省：对比每个模型的成本 vs GPT-5.5 的成本
    let gpt55EquivalentCost = 0;
    for (const row of modelBreakdown.rows) {
      const inputTokens = parseInt(row.total_input_tokens as string) || 0;
      const outputTokens = parseInt(row.total_output_tokens as string) || 0;
      
      // 计算 GPT-5.5 等效成本（作为高端模型的基准）
      const gpt55Cost = calculateRequestCost('openai/gpt-5.5', inputTokens, outputTokens);
      gpt55EquivalentCost += gpt55Cost;
    }
    
    // 节省金额 = GPT-5.5 等效成本 - 实际成本
    const totalSavedCents = Math.round(Math.max(0, gpt55EquivalentCost - totalCost) * 100);
    const averageSavedPercent = gpt55EquivalentCost > 0 
      ? Math.round(((gpt55EquivalentCost - totalCost) / gpt55EquivalentCost) * 100) 
      : 0;

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
      // 每日节省按实际请求量的 GPT-5.5 对比计算
      const dayRequests = parseInt(row.requests as string) || 0;
      // 使用平均节省比例估算每日节省
      const savedCents = averageSavedPercent > 0 
        ? Math.round(costCents * averageSavedPercent / (100 - averageSavedPercent || 1))
        : 0;
      return {
        date: (row.day as Date).toISOString().split('T')[0] || '',
        savedCents,
        requests: dayRequests,
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

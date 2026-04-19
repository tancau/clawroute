/**
 * GET /api/admin/revenue
 * Admin 收入统计 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 收入数据类型
interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  revenueByTier: {
    tier: string;
    revenue: number;
    users: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
    newUsers: number;
  }[];
  averageRevenuePerUser: number;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<RevenueStats>>> {
  try {
    // 验证 JWT 和 Admin 权限
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

    // 检查是否是 Admin
    const userResult = await sql`
      SELECT tier, status FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userTier = userResult.rows[0]?.tier as string;
    const userStatus = userResult.rows[0]?.status as string;

    // 只有 admin 或特定用户可以访问
    if (userTier !== 'admin' && userStatus !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // 计算时间范围
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // 获取总收入（基于 request_logs 的 cost）
    const totalCostResult = await sql`
      SELECT COALESCE(SUM(cost_usd), 0) as total_cost
      FROM request_logs
    `;

    const totalRevenue = parseFloat(totalCostResult.rows[0]?.total_cost as string) || 0;

    // 获取月度收入
    const monthlyCostResult = await sql`
      SELECT COALESCE(SUM(cost_usd), 0) as monthly_cost
      FROM request_logs
      WHERE created_at >= ${thirtyDaysAgo}
    `;

    const monthlyRevenue = parseFloat(monthlyCostResult.rows[0]?.monthly_cost as string) || 0;

    // 获取每日收入
    const dailyCostResult = await sql`
      SELECT COALESCE(SUM(cost_usd), 0) as daily_cost
      FROM request_logs
      WHERE created_at >= ${oneDayAgo}
    `;

    const dailyRevenue = parseFloat(dailyCostResult.rows[0]?.daily_cost as string) || 0;

    // 按用户等级统计
    const tierStatsResult = await sql`
      SELECT 
        u.tier,
        COUNT(DISTINCT u.id) as users,
        COALESCE(SUM(rl.cost_usd), 0) as revenue
      FROM users u
      LEFT JOIN request_logs rl ON u.id = rl.user_id
      GROUP BY u.tier
      ORDER BY revenue DESC
    `;

    const revenueByTier = tierStatsResult.rows.map(row => ({
      tier: row.tier as string,
      users: parseInt(row.users as string) || 0,
      revenue: parseFloat(row.revenue as string) || 0,
    }));

    // 按月统计收入
    const monthlyBreakdownResult = await sql`
      SELECT 
        DATE_TRUNC('month', TO_TIMESTAMP(created_at / 1000)) as month,
        COALESCE(SUM(cost_usd), 0) as revenue,
        COUNT(DISTINCT user_id) as active_users
      FROM request_logs
      WHERE created_at >= ${now - 365 * 24 * 60 * 60 * 1000}
      GROUP BY DATE_TRUNC('month', TO_TIMESTAMP(created_at / 1000))
      ORDER BY month DESC
      LIMIT 12
    `;

    const revenueByMonth = monthlyBreakdownResult.rows.map(row => ({
      month: (row.month as Date).toISOString().split('T')[0]?.slice(0, 7) || '',
      revenue: parseFloat(row.revenue as string) || 0,
      newUsers: parseInt(row.active_users as string) || 0,
    }));

    // 计算平均每用户收入
    const userCountResult = await sql`
      SELECT COUNT(*) as total_users FROM users
    `;

    const totalUsers = parseInt(userCountResult.rows[0]?.total_users as string) || 1;
    const averageRevenuePerUser = totalRevenue / totalUsers;

    const stats: RevenueStats = {
      totalRevenue,
      monthlyRevenue,
      dailyRevenue,
      revenueByTier,
      revenueByMonth,
      averageRevenuePerUser,
    };

    return NextResponse.json({ success: true, data: stats });

  } catch (error) {
    console.error('[Admin Revenue] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
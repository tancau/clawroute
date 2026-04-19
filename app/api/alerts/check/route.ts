/**
 * POST /api/alerts/check
 * 检查是否触发告警
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT, getCredits } from '@/lib/auth';
import { 
  ensureAlertsTable, 
  ensureRequestLogsTable,
  ensureWebhooksTable,
  ensureWebhookLogsTable,
} from '@/lib/db-tables';
import { triggerWebhooks } from '@/lib/webhook';

// 响应类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 告警检查结果
interface AlertCheckResult {
  triggered: boolean;
  alerts: {
    type: 'credits_low' | 'daily_limit' | 'error_rate';
    triggered: boolean;
    details: {
      current: number;
      threshold: number;
      message?: string;
    };
  }[];
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AlertCheckResult>>> {
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

    await ensureAlertsTable();
    await ensureRequestLogsTable();
    await ensureWebhooksTable();
    await ensureWebhookLogsTable();

    // 获取告警设置
    const alertSettings = await sql`
      SELECT 
        credits_threshold, daily_request_limit, error_rate_threshold,
        email_enabled, webhook_enabled
      FROM alerts WHERE user_id = ${userId}
    `;

    if (alertSettings.rows.length === 0) {
      // 无告警设置，返回未触发
      return NextResponse.json({
        success: true,
        data: {
          triggered: false,
          alerts: [],
        },
      });
    }

    const settings = alertSettings.rows[0]!;
    const results: AlertCheckResult = {
      triggered: false,
      alerts: [],
    };

    // 1. 检查 Credits 余额
    const currentCredits = await getCredits(userId);
    const creditsThreshold = settings.credits_threshold as number;
    const creditsLowTriggered = currentCredits <= creditsThreshold;
    
    results.alerts.push({
      type: 'credits_low',
      triggered: creditsLowTriggered,
      details: {
        current: currentCredits,
        threshold: creditsThreshold,
        message: creditsLowTriggered 
          ? `Credits 余额 (${currentCredits}) 低于阈值 (${creditsThreshold})`
          : undefined,
      },
    });

    if (creditsLowTriggered) {
      results.triggered = true;
      
      // 触发 Webhook
      if (settings.webhook_enabled) {
        await triggerWebhooks(userId, 'credits.low', {
          userId,
          currentCredits,
          threshold: creditsThreshold,
          timestamp: Date.now(),
        });
      }
    }

    // 2. 检查每日请求量
    const today = new Date();
    const dayStart = Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 1000);
    
    const dailyStats = await sql`
      SELECT COUNT(*) as count
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${dayStart}
    `;
    
    const dailyRequestCount = parseInt((dailyStats.rows[0]?.count as string) || '0');
    const dailyLimit = settings.daily_request_limit as number;
    const dailyLimitTriggered = dailyRequestCount >= dailyLimit;

    results.alerts.push({
      type: 'daily_limit',
      triggered: dailyLimitTriggered,
      details: {
        current: dailyRequestCount,
        threshold: dailyLimit,
        message: dailyLimitTriggered
          ? `今日请求量 (${dailyRequestCount}) 已达到限制 (${dailyLimit})`
          : undefined,
      },
    });

    if (dailyLimitTriggered) {
      results.triggered = true;
      
      // 触发 Webhook
      if (settings.webhook_enabled) {
        await triggerWebhooks(userId, 'daily.limit', {
          userId,
          dailyRequests: dailyRequestCount,
          limit: dailyLimit,
          timestamp: Date.now(),
        });
      }
    }

    // 3. 检查错误率
    const oneHourAgo = Date.now() - 3600000;
    
    const errorStats = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as errors
      FROM request_logs 
      WHERE user_id = ${userId} AND created_at >= ${oneHourAgo}
    `;
    
    const totalRequests = parseInt((errorStats.rows[0]?.total as string) || '0');
    const errorCount = parseInt((errorStats.rows[0]?.errors as string) || '0');
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
    const errorRateThreshold = parseFloat(settings.error_rate_threshold as string);
    const errorRateTriggered = errorRate >= errorRateThreshold;

    results.alerts.push({
      type: 'error_rate',
      triggered: errorRateTriggered,
      details: {
        current: errorRate,
        threshold: errorRateThreshold,
        message: errorRateTriggered
          ? `错误率 (${errorRate.toFixed(1)}%) 超过阈值 (${errorRateThreshold}%)`
          : undefined,
      },
    });

    if (errorRateTriggered) {
      results.triggered = true;
      
      // 触发 Webhook
      if (settings.webhook_enabled) {
        await triggerWebhooks(userId, 'error.rate.high', {
          userId,
          errorRate: errorRate.toFixed(1),
          threshold: errorRateThreshold,
          errorCount,
          totalRequests,
          timestamp: Date.now(),
        });
      }
    }

    return NextResponse.json({ success: true, data: results });

  } catch (error) {
    console.error('[Alerts Check] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
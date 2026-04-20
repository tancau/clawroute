/**
 * GET /api/user/usage
 * 
 * 用户使用统计 API
 * 
 * 返回：
 * - 今日使用量和限制
 * - 本月使用量和限制
 * - 速率限制状态
 * - 历史使用记录（可选）
 */

import { NextRequest, NextResponse } from 'next/server';
import { findUserByApiKey } from '@/lib/auth';
import { 
  getUsageStats, 
  getUsageHistory, 
  getTierLimits 
} from '@/lib/db/usage-tracking';
import { checkRateLimit, getTierRateLimitConfig } from '@/lib/middleware/rate-limit';

// ==================== 主 Handler ====================

export async function GET(request: NextRequest) {
  try {
    // 1. 验证 API Key
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || authHeader;
    
    let userId: string;
    let tier: string;
    
    if (apiKey) {
      const user = await findUserByApiKey(apiKey);
      if (!user) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } },
          { status: 401 }
        );
      }
      userId = user.id;
      tier = user.tier;
    } else {
      // 开发模式允许无认证
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'API key required' } },
          { status: 401 }
        );
      }
      userId = 'dev-user';
      tier = 'free';
    }
    
    // 2. 获取查询参数
    const { searchParams } = new URL(request.url);
    const history = searchParams.get('history') === 'true';
    const historyDays = parseInt(searchParams.get('days') || '30', 10);
    
    // 3. 获取使用统计
    const stats = await getUsageStats(userId, tier);
    
    // 4. 获取速率限制状态
    const rateLimitConfig = getTierRateLimitConfig(tier);
    const rateLimitCheck = await checkRateLimit(userId, tier);
    
    // 5. 构建响应
    const response: {
      tier: string;
      limits: { daily: number; monthly: number };
      today: { calls: number; limit: number; remaining: number };
      month: { calls: number; limit: number; remaining: number };
      rateLimit: {
        limit: number;
        remaining: number;
        resetIn: number;
        window: string;
      };
      history?: Array<{
        date: string;
        calls: number;
        inputTokens: number;
        outputTokens: number;
      }>;
    } = {
      tier,
      limits: getTierLimits(tier),
      today: stats.today,
      month: stats.month,
      rateLimit: {
        limit: rateLimitConfig.maxRequests,
        remaining: rateLimitCheck.remaining,
        resetIn: rateLimitCheck.reset,
        window: `${rateLimitConfig.windowSeconds}s`,
      },
    };
    
    // 6. 添加历史记录（如果请求）
    if (history) {
      const historyData = await getUsageHistory(userId, historyDays);
      response.history = historyData.map(d => ({
        date: d.date,
        calls: d.apiCalls,
        inputTokens: d.inputTokens,
        outputTokens: d.outputTokens,
      }));
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Usage API] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch usage stats' } },
      { status: 500 }
    );
  }
}

// ==================== OPTIONS Handler (CORS) ====================

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

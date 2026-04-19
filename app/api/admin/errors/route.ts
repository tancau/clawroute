/**
 * GET /api/admin/errors
 * Admin API 错误追踪 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';
import { ensureErrorTrackingTable } from '@/lib/db-tables';
import crypto from 'crypto';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 错误追踪类型
interface ErrorRecord {
  id: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  requestId?: string;
  model?: string;
  provider?: string;
  occurrenceCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  resolved: boolean;
  userId?: string;
}

// 错误统计类型
interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  unresolvedErrors: number;
  errorsByType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  errorsByModel: {
    model: string;
    count: number;
    errorRate: number;
  }[];
  errorsByProvider: {
    provider: string;
    count: number;
    errorRate: number;
  }[];
  recentErrors: ErrorRecord[];
  errorTimeline: {
    date: string;
    errors: number;
  }[];
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ErrorStats>>> {
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

    if (userTier !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // 确保错误追踪表存在
    await ensureErrorTrackingTable();

    // 获取总错误数
    const totalErrorsResult = await sql`
      SELECT COUNT(*) as count
      FROM request_logs
      WHERE success = false AND created_at >= ${thirtyDaysAgo}
    `;

    const totalErrors = parseInt(totalErrorsResult.rows[0]?.count as string) || 0;

    // 获取唯一错误数（基于错误消息）
    const uniqueErrorsResult = await sql`
      SELECT COUNT(DISTINCT error_message) as count
      FROM request_logs
      WHERE success = false AND created_at >= ${thirtyDaysAgo}
    `;

    const uniqueErrors = parseInt(uniqueErrorsResult.rows[0]?.count as string) || 0;

    // 获取未解决的错误数
    const unresolvedResult = await sql`
      SELECT COUNT(*) as count
      FROM error_tracking
      WHERE resolved = false
    `;

    const unresolvedErrors = parseInt(unresolvedResult.rows[0]?.count as string) || 0;

    // 按错误类型统计
    const errorsByTypeResult = await sql`
      SELECT 
        CASE 
          WHEN error_message LIKE '%timeout%' THEN 'Timeout'
          WHEN error_message LIKE '%rate limit%' THEN 'Rate Limit'
          WHEN error_message LIKE '%auth%' OR error_message LIKE '%unauthorized%' THEN 'Auth'
          WHEN error_message LIKE '%invalid%' THEN 'Invalid Input'
          WHEN error_message LIKE '%network%' OR error_message LIKE '%connection%' THEN 'Network'
          ELSE 'Other'
        END as error_type,
        COUNT(*) as count
      FROM request_logs
      WHERE success = false AND created_at >= ${thirtyDaysAgo}
      GROUP BY error_type
      ORDER BY count DESC
    `;

    const errorsByType = errorsByTypeResult.rows.map(row => ({
      type: row.error_type as string,
      count: parseInt(row.count as string) || 0,
      percentage: totalErrors > 0 ? (parseInt(row.count as string) / totalErrors * 100) : 0,
    }));

    // 按模型统计错误
    const errorsByModelResult = await sql`
      SELECT 
        rl.model,
        COUNT(CASE WHEN rl.success = false THEN 1 END) as errors,
        COUNT(*) as total
      FROM request_logs rl
      WHERE rl.created_at >= ${thirtyDaysAgo}
      GROUP BY rl.model
      HAVING COUNT(CASE WHEN rl.success = false THEN 1 END) > 0
      ORDER BY errors DESC
      LIMIT 10
    `;

    const errorsByModel = errorsByModelResult.rows.map(row => ({
      model: row.model as string,
      count: parseInt(row.errors as string) || 0,
      errorRate: parseInt(row.total as string) > 0 
        ? (parseInt(row.errors as string) / parseInt(row.total as string) * 100) 
        : 0,
    }));

    // 按提供商统计错误
    const errorsByProviderResult = await sql`
      SELECT 
        rl.provider,
        COUNT(CASE WHEN rl.success = false THEN 1 END) as errors,
        COUNT(*) as total
      FROM request_logs rl
      WHERE rl.created_at >= ${thirtyDaysAgo}
      GROUP BY rl.provider
      HAVING COUNT(CASE WHEN rl.success = false THEN 1 END) > 0
      ORDER BY errors DESC
    `;

    const errorsByProvider = errorsByProviderResult.rows.map(row => ({
      provider: row.provider as string,
      count: parseInt(row.errors as string) || 0,
      errorRate: parseInt(row.total as string) > 0 
        ? (parseInt(row.errors as string) / parseInt(row.total as string) * 100) 
        : 0,
    }));

    // 最近错误列表
    const recentErrorsResult = await sql`
      SELECT 
        id, user_id, model, provider, error_message, 
        created_at, latency_ms, intent
      FROM request_logs
      WHERE success = false AND created_at >= ${sevenDaysAgo}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const recentErrors: ErrorRecord[] = recentErrorsResult.rows.map(row => ({
      id: row.id as string,
      errorType: classifyError(row.error_message as string),
      errorMessage: (row.error_message as string) || 'Unknown error',
      requestId: row.id as string,
      model: (row.model as string) || undefined,
      provider: (row.provider as string) || undefined,
      occurrenceCount: 1,
      firstSeenAt: row.created_at as number,
      lastSeenAt: row.created_at as number,
      resolved: false,
      userId: (row.user_id as string) || undefined,
    }));

    // 错误时间线（按天）
    const errorTimelineResult = await sql`
      SELECT 
        DATE(TO_TIMESTAMP(created_at / 1000)) as date,
        COUNT(*) as errors
      FROM request_logs
      WHERE success = false AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(TO_TIMESTAMP(created_at / 1000))
      ORDER BY date DESC
      LIMIT 30
    `;

    const errorTimeline = errorTimelineResult.rows.map(row => ({
      date: (row.date as Date).toISOString().split('T')[0] || '',
      errors: parseInt(row.errors as string) || 0,
    }));

    const stats: ErrorStats = {
      totalErrors,
      uniqueErrors,
      unresolvedErrors,
      errorsByType,
      errorsByModel,
      errorsByProvider,
      recentErrors,
      errorTimeline,
    };

    return NextResponse.json({ success: true, data: stats });

  } catch (error) {
    console.error('[Admin Errors] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - 标记错误为已解决
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
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

    // 检查 Admin 权限
    const userResult = await sql`
      SELECT tier FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0 || userResult.rows[0]?.tier !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    await ensureErrorTrackingTable();

    // 创建或更新错误追踪记录
    const errorId = crypto.randomUUID();
    const now = Date.now();

    await sql`
      INSERT INTO error_tracking (
        id, error_type, error_message, error_stack, request_id,
        model, provider, occurrence_count, first_seen_at, last_seen_at, resolved
      ) VALUES (
        ${errorId},
        ${classifyError(body.errorMessage)},
        ${body.errorMessage},
        ${body.errorStack || null},
        ${body.requestId || null},
        ${body.model || null},
        ${body.provider || null},
        1,
        ${now},
        ${now},
        false
      )
      ON CONFLICT (id) DO UPDATE SET
        resolved = ${body.resolved || false},
        last_seen_at = ${now}
    `;

    return NextResponse.json({ success: true, data: { errorId } });

  } catch (error) {
    console.error('[Admin Errors POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - 更新错误状态
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
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

    // 检查 Admin 权限
    const userResult = await sql`
      SELECT tier FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0 || userResult.rows[0]?.tier !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    await ensureErrorTrackingTable();

    if (!body.errorId) {
      return NextResponse.json(
        { success: false, error: 'Error ID is required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE error_tracking
      SET resolved = ${body.resolved ?? true}
      WHERE id = ${body.errorId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Admin Errors PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 分类错误类型
function classifyError(errorMessage: string): string {
  if (!errorMessage) return 'Unknown';
  
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('timeout')) return 'Timeout';
  if (lowerMessage.includes('rate limit')) return 'Rate Limit';
  if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized')) return 'Auth';
  if (lowerMessage.includes('invalid') || lowerMessage.includes('bad request')) return 'Invalid Input';
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) return 'Network';
  if (lowerMessage.includes('insufficient') || lowerMessage.includes('credits')) return 'Credits';
  
  return 'Other';
}
/**
 * POST /api/webhooks - 注册 Webhook
 * GET /api/webhooks - 获取 Webhook 列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';
import { ensureWebhooksTable } from '@/lib/db-tables';
import crypto from 'crypto';

// 响应类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Webhook 类型
interface Webhook {
  id: string;
  userId: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  lastTriggeredAt?: number;
  failureCount: number;
  createdAt: number;
  updatedAt: number;
}

// 支持的事件类型
const SUPPORTED_EVENTS = [
  'request.completed',
  'credits.low',
  'daily.limit',
  'error.rate.high',
  'error',
  '*',
];

// GET - 获取 Webhook 列表
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Webhook[]>>> {
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
    await ensureWebhooksTable();

    const result = await sql`
      SELECT 
        id, user_id, url, secret, events, active, 
        last_triggered_at, failure_count, created_at, updated_at
      FROM webhooks WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    const webhooks: Webhook[] = result.rows.map(row => ({
      id: row.id as string,
      userId: row.user_id as string,
      url: row.url as string,
      secret: row.secret ? '••••••••' : undefined, // 隐藏实际 secret
      events: row.events as string[],
      active: row.active as boolean,
      lastTriggeredAt: (row.last_triggered_at as number) || undefined,
      failureCount: row.failure_count as number,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }));

    return NextResponse.json({ success: true, data: webhooks });

  } catch (error) {
    console.error('[Webhooks GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - 注册新 Webhook
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Webhook>>> {
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
    const body = await request.json();

    // 验证 URL
    if (!body.url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    let url: URL;
    try {
      url = new URL(body.url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // 只允许 HTTPS（开发环境允许 HTTP）
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Only HTTPS URLs are allowed in production' },
        { status: 400 }
      );
    }

    // 验证 events
    const events = body.events || ['*'];
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { success: false, error: 'Events must be an array' },
        { status: 400 }
      );
    }

    for (const event of events) {
      if (!SUPPORTED_EVENTS.includes(event)) {
        return NextResponse.json(
          { success: false, error: `Unsupported event: ${event}` },
          { status: 400 }
        );
      }
    }

    // 检查用户 Webhook 数量限制
    await ensureWebhooksTable();
    const countResult = await sql`
      SELECT COUNT(*) as count FROM webhooks WHERE user_id = ${userId}
    `;
    const webhookCount = parseInt((countResult.rows[0]?.count as string) || '0');

    if (webhookCount >= 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 10 webhooks allowed' },
        { status: 400 }
      );
    }

    // 生成 ID 和 secret
    const id = crypto.randomUUID();
    const secret = body.secret || crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    // 保存 Webhook
    await sql`
      INSERT INTO webhooks (
        id, user_id, url, secret, events, active, failure_count, created_at, updated_at
      ) VALUES (
        ${id},
        ${userId},
        ${body.url},
        ${secret},
        ${JSON.stringify(events)},
        true,
        0,
        ${now},
        ${now}
      )
    `;

    const webhook: Webhook = {
      id,
      userId,
      url: body.url,
      secret, // 返回一次用于保存
      events,
      active: true,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, data: webhook });

  } catch (error) {
    console.error('[Webhooks POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
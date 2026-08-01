/**
 * POST /api/webhooks/test - 测试 Webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { verifyJWT, getJWTSecret } from '@/lib/auth';
import { ensureWebhooksTable } from '@/lib/db-tables';
import { testWebhook, sendWebhook } from '@/lib/webhook';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TestResult {
  url: string;
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  durationMs?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<TestResult>>> {
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

    const payload = await verifyJWT(token, getJWTSecret());
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }
    const body = await request.json();

    // 测试新 URL 或已存在的 Webhook
    if (body.url) {
      // 测试新 URL
      const result = await testWebhook(body.url, body.secret);
      return NextResponse.json({
        success: result.success,
        data: {
          url: body.url,
          ...result,
        },
      });
    }

    if (body.webhookId) {
      // 测试已存在的 Webhook
      await ensureWebhooksTable();
      
      const result = await db`
        SELECT id, url, secret FROM webhooks
        WHERE id = ${body.webhookId} AND user_id = ${userId}
      `;

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Webhook not found' },
          { status: 404 }
        );
      }

      const webhook = result.rows[0]!;
      const testResult = await sendWebhook(
        webhook.url as string,
        {
          userId,
          event: 'request.completed',
          data: {
            message: 'Test webhook from HopLLM',
            test: true,
          },
          timestamp: Date.now(),
        },
        (webhook.secret as string) || undefined
      );

      return NextResponse.json({
        success: testResult.success,
        data: {
          url: webhook.url as string,
          ...testResult,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'URL or webhookId is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Webhooks Test] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
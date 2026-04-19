/**
 * POST /api/webhooks/test - 测试 Webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';
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

    const payload = verifyJWT(token, process.env.JWT_SECRET || 'clawrouter-dev-secret');
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;
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
      
      const result = await sql`
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
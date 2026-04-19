/**
 * Webhook 触发工具
 */

import { sql } from '@vercel/postgres';
import { ensureWebhooksTable, ensureWebhookLogsTable } from './db-tables';

// Webhook 事件类型
type WebhookEventType = 
  | 'credits.low'
  | 'daily.limit'
  | 'error.rate.high'
  | 'request.completed'
  | 'user.registered';

// Webhook payload
interface WebhookPayload {
  userId: string;
  event: WebhookEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * 触发用户的 Webhooks
 */
export async function triggerWebhooks(
  userId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await ensureWebhooksTable();
    await ensureWebhookLogsTable();

    // 获取用户的所有活跃 Webhooks
    const webhooks = await sql`
      SELECT id, url, secret
      FROM webhooks
      WHERE user_id = ${userId} AND active = true
    `;

    if (webhooks.rows.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      userId,
      event,
      data,
      timestamp: Date.now(),
    };

    // 发送到所有 Webhook endpoints
    for (const webhook of webhooks.rows) {
      const webhookId = webhook.id as string;
      const url = webhook.url as string;
      const secret = webhook.secret as string | null;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(secret ? { 'X-Webhook-Secret': secret } : {}),
          },
          body: JSON.stringify(payload),
        });

        // 记录结果
        await sql`
          INSERT INTO webhook_logs (webhook_id, event, status, response_code, created_at)
          VALUES (${webhookId}, ${event}, ${response.ok ? 'success' : 'failed'}, ${response.status}, ${Date.now()})
        `;
      } catch (error) {
        console.error(`[Webhook] Failed to send to ${url}:`, error);
        
        // 记录失败
        await sql`
          INSERT INTO webhook_logs (webhook_id, event, status, error_message, created_at)
          VALUES (${webhookId}, ${event}, 'failed', ${String(error)}, ${Date.now()})
        `;
      }
    }
  } catch (error) {
    console.error('[Webhook] Error triggering webhooks:', error);
  }
}

/**
 * 验证 Webhook Secret
 */
export function verifyWebhookSecret(
  receivedSecret: string,
  storedSecret: string
): boolean {
  return receivedSecret === storedSecret;
}

/**
 * 测试 Webhook 连接
 */
export async function testWebhook(url: string, secret?: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Test': 'true',
        ...(secret ? { 'X-Webhook-Secret': secret } : {}),
      },
      body: JSON.stringify({
        event: 'test',
        data: { message: 'This is a test webhook' },
        timestamp: Date.now(),
      }),
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * 发送单个 Webhook
 */
export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Webhook-Secret': secret } : {}),
      },
      body: JSON.stringify(payload),
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
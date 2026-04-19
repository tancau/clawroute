/**
 * GET /api/export/logs - 导出请求日志
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';
import { ensureWebhookLogsTable } from '@/lib/db-tables';

// Webhook 日志类型
interface WebhookLogRecord {
  id: string;
  webhookId: string;
  eventType: string;
  payload: string;
  responseStatus: number;
  responseBody?: string;
  success: boolean;
  durationMs: number;
  createdAt: number;
}

export async function GET(request: NextRequest): Promise<NextResponse | Response> {
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

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') as 'json' | 'csv') || 'json';
    const startDate = searchParams.get('startDate') ? parseInt(searchParams.get('startDate')!) : Date.now() - 7 * 24 * 60 * 60 * 1000;
    const endDate = searchParams.get('endDate') ? parseInt(searchParams.get('endDate')!) : Date.now();
    const logType = (searchParams.get('type') as 'webhook' | 'notification' | 'all') || 'all';

    await ensureWebhookLogsTable();

    let webhookLogs: WebhookLogRecord[] = [];
    let notificationLogs: unknown[] = [];

    // 获取 Webhook 日志
    if (logType === 'webhook' || logType === 'all') {
      const webhookResult = await sql`
        SELECT 
          wl.id, wl.webhook_id, wl.event_type, wl.payload, 
          wl.response_status, wl.response_body, wl.success, 
          wl.duration_ms, wl.created_at
        FROM webhook_logs wl
        JOIN webhooks w ON wl.webhook_id = w.id
        WHERE w.user_id = ${userId}
          AND wl.created_at >= ${startDate}
          AND wl.created_at <= ${endDate}
        ORDER BY wl.created_at DESC
        LIMIT 5000
      `;

      webhookLogs = webhookResult.rows.map(row => ({
        id: row.id as string,
        webhookId: row.webhook_id as string,
        eventType: row.event_type as string,
        payload: row.payload as string,
        responseStatus: row.response_status as number,
        responseBody: (row.response_body as string) || undefined,
        success: row.success as boolean,
        durationMs: row.duration_ms as number,
        createdAt: row.created_at as number,
      }));
    }

    // 获取通知日志
    if (logType === 'notification' || logType === 'all') {
      await ensureNotificationsTableExists();
      
      const notificationResult = await sql`
        SELECT 
          id, user_id, type, subject, status, 
          sent_at, error_message, created_at
        FROM notifications
        WHERE user_id = ${userId}
          AND created_at >= ${startDate}
          AND created_at <= ${endDate}
        ORDER BY created_at DESC
        LIMIT 5000
      `;

      notificationLogs = notificationResult.rows.map(row => ({
        id: row.id as string,
        userId: row.user_id as string,
        type: row.type as string,
        subject: row.subject as string,
        status: row.status as string,
        sentAt: (row.sent_at as number) || undefined,
        errorMessage: (row.error_message as string) || undefined,
        createdAt: row.created_at as number,
      }));
    }

    // 根据 format 返回不同格式
    if (format === 'csv') {
      const csv = convertLogsToCSV(webhookLogs, notificationLogs, logType);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="logs-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        webhookLogs,
        notificationLogs,
        summary: {
          totalWebhookLogs: webhookLogs.length,
          totalNotificationLogs: notificationLogs.length,
          webhookSuccessRate: webhookLogs.length > 0
            ? (webhookLogs.filter(l => l.success).length / webhookLogs.length * 100).toFixed(1)
            : '0',
          exportParams: {
            startDate,
            endDate,
            format,
            logType,
          },
        },
      },
    });

  } catch (error) {
    console.error('[Export Logs] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 确保通知表存在
async function ensureNotificationsTableExists() {
  const { sql } = await import('@vercel/postgres');
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at INTEGER,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      metadata TEXT
    )
  `;
}

// 转换为 CSV
function convertLogsToCSV(
  webhookLogs: WebhookLogRecord[],
  notificationLogs: unknown[],
  logType: string
): string {
  const rows: string[][] = [];

  // Webhook 日志
  if (logType === 'webhook' || logType === 'all') {
    if (rows.length === 0) {
      rows.push([
        'Log Type',
        'ID',
        'Webhook ID',
        'Event Type',
        'Response Status',
        'Success',
        'Duration (ms)',
        'Error Message',
        'Created At',
      ]);
    }

    for (const log of webhookLogs) {
      rows.push([
        'webhook',
        log.id,
        log.webhookId,
        log.eventType,
        String(log.responseStatus),
        log.success ? 'true' : 'false',
        String(log.durationMs),
        '',
        new Date(log.createdAt).toISOString(),
      ]);
    }
  }

  // 通知日志
  if (logType === 'notification' || logType === 'all') {
    if (rows.length === 0) {
      rows.push([
        'Log Type',
        'ID',
        'Type',
        'Subject',
        'Status',
        'Sent At',
        'Error Message',
        'Created At',
      ]);
    }

    for (const log of notificationLogs as Array<{
      id: string;
      type: string;
      subject: string;
      status: string;
      sentAt?: number;
      errorMessage?: string;
      createdAt: number;
    }>) {
      rows.push([
        'notification',
        log.id,
        log.type,
        log.subject,
        log.status,
        log.sentAt ? new Date(log.sentAt).toISOString() : '',
        log.errorMessage || '',
        new Date(log.createdAt).toISOString(),
      ]);
    }
  }

  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}
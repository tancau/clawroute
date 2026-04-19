/**
 * GET /api/alerts - 获取用户告警设置
 * PUT /api/alerts - 更新告警设置
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';
import { ensureAlertsTable } from '@/lib/db-tables';
import crypto from 'crypto';

// 响应类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 告警设置类型
interface AlertSettings {
  userId: string;
  creditsThreshold: number;
  dailyRequestLimit: number;
  errorRateThreshold: number;
  emailEnabled: boolean;
  webhookEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// 默认告警设置
const DEFAULT_ALERT_SETTINGS: Partial<AlertSettings> = {
  creditsThreshold: 20,
  dailyRequestLimit: 1000,
  errorRateThreshold: 10,
  emailEnabled: true,
  webhookEnabled: false,
};

// GET - 获取告警设置
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AlertSettings>>> {
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

    // 查询告警设置
    const result = await sql`
      SELECT 
        user_id, credits_threshold, daily_request_limit, error_rate_threshold,
        email_enabled, webhook_enabled, created_at, updated_at
      FROM alerts WHERE user_id = ${userId}
    `;

    if (result.rows.length === 0) {
      // 创建默认设置
      const now = Date.now();
      await sql`
        INSERT INTO alerts (
          id, user_id, credits_threshold, daily_request_limit, 
          error_rate_threshold, email_enabled, webhook_enabled, created_at, updated_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${userId},
          ${DEFAULT_ALERT_SETTINGS.creditsThreshold},
          ${DEFAULT_ALERT_SETTINGS.dailyRequestLimit},
          ${DEFAULT_ALERT_SETTINGS.errorRateThreshold},
          ${DEFAULT_ALERT_SETTINGS.emailEnabled},
          ${DEFAULT_ALERT_SETTINGS.webhookEnabled},
          ${now},
          ${now}
        )
      `;

      const settings: AlertSettings = {
        userId,
        creditsThreshold: DEFAULT_ALERT_SETTINGS.creditsThreshold!,
        dailyRequestLimit: DEFAULT_ALERT_SETTINGS.dailyRequestLimit!,
        errorRateThreshold: DEFAULT_ALERT_SETTINGS.errorRateThreshold!,
        emailEnabled: DEFAULT_ALERT_SETTINGS.emailEnabled!,
        webhookEnabled: DEFAULT_ALERT_SETTINGS.webhookEnabled!,
        createdAt: now,
        updatedAt: now,
      };

      return NextResponse.json({ success: true, data: settings });
    }

    const row = result.rows[0]!;
    const settings: AlertSettings = {
      userId: row.user_id as string,
      creditsThreshold: row.credits_threshold as number,
      dailyRequestLimit: row.daily_request_limit as number,
      errorRateThreshold: parseFloat(row.error_rate_threshold as string),
      emailEnabled: row.email_enabled as boolean,
      webhookEnabled: row.webhook_enabled as boolean,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };

    return NextResponse.json({ success: true, data: settings });

  } catch (error) {
    console.error('[Alerts GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - 更新告警设置
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<AlertSettings>>> {
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

    // 验证参数
    if (body.creditsThreshold !== undefined && body.creditsThreshold < 0) {
      return NextResponse.json(
        { success: false, error: 'Credits threshold must be >= 0' },
        { status: 400 }
      );
    }

    if (body.dailyRequestLimit !== undefined && body.dailyRequestLimit < 0) {
      return NextResponse.json(
        { success: false, error: 'Daily request limit must be >= 0' },
        { status: 400 }
      );
    }

    if (body.errorRateThreshold !== undefined && (body.errorRateThreshold < 0 || body.errorRateThreshold > 100)) {
      return NextResponse.json(
        { success: false, error: 'Error rate threshold must be between 0 and 100' },
        { status: 400 }
      );
    }

    await ensureAlertsTable();
    const now = Date.now();

    // 检查是否存在设置
    const existing = await sql`
      SELECT user_id FROM alerts WHERE user_id = ${userId}
    `;

    if (existing.rows.length === 0) {
      // 创建新设置
      const settings = {
        creditsThreshold: body.creditsThreshold ?? DEFAULT_ALERT_SETTINGS.creditsThreshold,
        dailyRequestLimit: body.dailyRequestLimit ?? DEFAULT_ALERT_SETTINGS.dailyRequestLimit,
        errorRateThreshold: body.errorRateThreshold ?? DEFAULT_ALERT_SETTINGS.errorRateThreshold,
        emailEnabled: body.emailEnabled ?? DEFAULT_ALERT_SETTINGS.emailEnabled,
        webhookEnabled: body.webhookEnabled ?? DEFAULT_ALERT_SETTINGS.webhookEnabled,
      };

      await sql`
        INSERT INTO alerts (
          id, user_id, credits_threshold, daily_request_limit,
          error_rate_threshold, email_enabled, webhook_enabled, created_at, updated_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${userId},
          ${settings.creditsThreshold},
          ${settings.dailyRequestLimit},
          ${settings.errorRateThreshold},
          ${settings.emailEnabled},
          ${settings.webhookEnabled},
          ${now},
          ${now}
        )
      `;

      return NextResponse.json({
        success: true,
        data: {
          userId,
          ...settings,
          createdAt: now,
          updatedAt: now,
        } as AlertSettings,
      });
    }

    // 更新现有设置
    await sql`
      UPDATE alerts SET
        credits_threshold = COALESCE(${body.creditsThreshold}, credits_threshold),
        daily_request_limit = COALESCE(${body.dailyRequestLimit}, daily_request_limit),
        error_rate_threshold = COALESCE(${body.errorRateThreshold}, error_rate_threshold),
        email_enabled = COALESCE(${body.emailEnabled}, email_enabled),
        webhook_enabled = COALESCE(${body.webhookEnabled}, webhook_enabled),
        updated_at = ${now}
      WHERE user_id = ${userId}
    `;

    // 获取更新后的设置
    const result = await sql`
      SELECT 
        user_id, credits_threshold, daily_request_limit, error_rate_threshold,
        email_enabled, webhook_enabled, created_at, updated_at
      FROM alerts WHERE user_id = ${userId}
    `;

    const row = result.rows[0]!;
    const settings: AlertSettings = {
      userId: row.user_id as string,
      creditsThreshold: row.credits_threshold as number,
      dailyRequestLimit: row.daily_request_limit as number,
      errorRateThreshold: parseFloat(row.error_rate_threshold as string),
      emailEnabled: row.email_enabled as boolean,
      webhookEnabled: row.webhook_enabled as boolean,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };

    return NextResponse.json({ success: true, data: settings });

  } catch (error) {
    console.error('[Alerts PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
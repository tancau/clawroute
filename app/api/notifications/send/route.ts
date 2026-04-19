/**
 * POST /api/notifications/send
 * 发送邮件通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';
import { 
  sendEmail, 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendApiKeyGeneratedEmail,
  sendCreditsLowAlertEmail,
  sendDailyLimitAlertEmail,
  sendErrorRateAlertEmail,
} from '@/lib/email';
import { ensureNotificationsTable } from '@/lib/db-tables';
import crypto from 'crypto';

// 通知类型
type NotificationType = 
  | 'verification'
  | 'password_reset'
  | 'api_key_generated'
  | 'credits_low'
  | 'daily_limit'
  | 'error_rate'
  | 'custom';

// 请求体类型
interface SendNotificationRequest {
  type: NotificationType;
  to?: string; // 可选，默认使用当前用户邮箱
  data?: {
    verificationCode?: string;
    resetToken?: string;
    resetUrl?: string;
    apiKeyPreview?: string;
    currentCredits?: number;
    threshold?: number;
    currentRequests?: number;
    limit?: number;
    errorRate?: number;
    recentErrors?: number;
    totalRequests?: number;
    // 自定义邮件
    subject?: string;
    html?: string;
    text?: string;
  };
}

// 响应类型
interface ApiResponse {
  success: boolean;
  data?: {
    notificationId: string;
    messageId?: string;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
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

    // 获取用户信息
    const userResult = await sql`
      SELECT id, email, name FROM users WHERE id = ${userId}
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0]!;
    const body: SendNotificationRequest = await request.json();

    // 验证请求体
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Notification type is required' },
        { status: 400 }
      );
    }

    const email = body.to || (user.email as string);
    const notificationId = crypto.randomUUID();
    let result;

    // 根据类型发送不同邮件
    switch (body.type) {
      case 'verification':
        if (!body.data?.verificationCode) {
          return NextResponse.json(
            { success: false, error: 'Verification code is required' },
            { status: 400 }
          );
        }
        result = await sendVerificationEmail(
          email,
          body.data.verificationCode,
          (user.name as string) || undefined
        );
        break;

      case 'password_reset':
        if (!body.data?.resetToken || !body.data?.resetUrl) {
          return NextResponse.json(
            { success: false, error: 'Reset token and URL are required' },
            { status: 400 }
          );
        }
        result = await sendPasswordResetEmail(
          email,
          body.data.resetToken,
          body.data.resetUrl,
          (user.name as string) || undefined
        );
        break;

      case 'api_key_generated':
        if (!body.data?.apiKeyPreview) {
          return NextResponse.json(
            { success: false, error: 'API key preview is required' },
            { status: 400 }
          );
        }
        result = await sendApiKeyGeneratedEmail(
          email,
          body.data.apiKeyPreview,
          (user.name as string) || undefined
        );
        break;

      case 'credits_low':
        if (body.data?.currentCredits === undefined || body.data?.threshold === undefined) {
          return NextResponse.json(
            { success: false, error: 'Current credits and threshold are required' },
            { status: 400 }
          );
        }
        result = await sendCreditsLowAlertEmail(
          email,
          body.data.currentCredits,
          body.data.threshold,
          (user.name as string) || undefined
        );
        break;

      case 'daily_limit':
        if (body.data?.currentRequests === undefined || body.data?.limit === undefined) {
          return NextResponse.json(
            { success: false, error: 'Current requests and limit are required' },
            { status: 400 }
          );
        }
        result = await sendDailyLimitAlertEmail(
          email,
          body.data.currentRequests,
          body.data.limit,
          (user.name as string) || undefined
        );
        break;

      case 'error_rate':
        if (
          body.data?.errorRate === undefined ||
          body.data?.threshold === undefined ||
          body.data?.recentErrors === undefined ||
          body.data?.totalRequests === undefined
        ) {
          return NextResponse.json(
            { success: false, error: 'Error rate data is incomplete' },
            { status: 400 }
          );
        }
        result = await sendErrorRateAlertEmail(
          email,
          body.data.errorRate,
          body.data.threshold,
          body.data.recentErrors,
          body.data.totalRequests,
          (user.name as string) || undefined
        );
        break;

      case 'custom':
        if (!body.data?.subject || !body.data?.html) {
          return NextResponse.json(
            { success: false, error: 'Subject and HTML content are required for custom email' },
            { status: 400 }
          );
        }
        result = await sendEmail({
          to: email,
          subject: body.data.subject,
          html: body.data.html,
          text: body.data.text,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    // 记录通知
    await ensureNotificationsTable();
    await sql`
      INSERT INTO notifications (id, user_id, type, subject, content, status, sent_at, created_at)
      VALUES (
        ${notificationId},
        ${userId},
        ${body.type},
        ${getSubjectForType(body.type, body.data)},
        ${JSON.stringify(body.data || {})},
        ${result.success ? 'sent' : 'failed'},
        ${result.success ? Date.now() : null},
        ${Date.now()}
      )
    `;

    if (!result.success) {
      // 更新错误信息
      await sql`
        UPDATE notifications SET error_message = ${result.error} WHERE id = ${notificationId}
      `;
    }

    return NextResponse.json({
      success: result.success,
      data: {
        notificationId,
        messageId: result.messageId,
      },
      error: result.success ? undefined : result.error,
    });

  } catch (error) {
    console.error('[Notifications Send] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 获取邮件主题
function getSubjectForType(type: NotificationType, data?: SendNotificationRequest['data']): string {
  switch (type) {
    case 'verification':
      return 'HopLLM - 邮箱验证';
    case 'password_reset':
      return 'HopLLM - 重置密码';
    case 'api_key_generated':
      return 'HopLLM - 新 API Key 生成通知';
    case 'credits_low':
      return `HopLLM - Credits 余额不足 (剩余 ${data?.currentCredits})`;
    case 'daily_limit':
      return `HopLLM - 每日请求量已达限制`;
    case 'error_rate':
      return `HopLLM - API 错误率过高`;
    case 'custom':
      return data?.subject || 'HopLLM Notification';
    default:
      return 'HopLLM Notification';
  }
}
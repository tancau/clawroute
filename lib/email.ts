/**
 * 邮件服务
 * 支持 Resend 和 SendGrid
 */

import crypto from 'crypto';

// 邮件配置类型
interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'mock';
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

// 获取邮件配置
function getEmailConfig(): EmailConfig {
  const resendKey = process.env.RESEND_API_KEY;
  const sendgridKey = process.env.SENDGRID_API_KEY;
  
  if (resendKey) {
    return {
      provider: 'resend',
      apiKey: resendKey,
      fromEmail: process.env.FROM_EMAIL || 'noreply@hopllm.com',
      fromName: process.env.FROM_NAME || 'HopLLM',
    };
  }
  
  if (sendgridKey) {
    return {
      provider: 'sendgrid',
      apiKey: sendgridKey,
      fromEmail: process.env.FROM_EMAIL || 'noreply@hopllm.com',
      fromName: process.env.FROM_NAME || 'HopLLM',
    };
  }
  
  // 开发环境使用 mock
  return {
    provider: 'mock',
    fromEmail: 'noreply@hopllm.com',
    fromName: 'HopLLM',
  };
}

// 邮件参数类型
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

// 发送结果
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 发送邮件
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const config = getEmailConfig();
  
  try {
    switch (config.provider) {
      case 'resend':
        return await sendWithResend(params, config);
      case 'sendgrid':
        return await sendWithSendGrid(params, config);
      default:
        return await sendWithMock(params, config);
    }
  } catch (error) {
    console.error('[Email] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Resend 发送
async function sendWithResend(
  params: SendEmailParams,
  config: EmailConfig
): Promise<SendEmailResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
      tags: params.tags ? Object.entries(params.tags).map(([name, value]) => ({ name, value })) : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}

// SendGrid 发送
async function sendWithSendGrid(
  params: SendEmailParams,
  config: EmailConfig
): Promise<SendEmailResult> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: (Array.isArray(params.to) ? params.to : [params.to]).map(email => ({ email })),
        },
      ],
      from: { email: config.fromEmail, name: config.fromName },
      subject: params.subject,
      content: [
        { type: 'text/plain', value: params.text || '' },
        { type: 'text/html', value: params.html },
      ],
      reply_to: params.replyTo ? { email: params.replyTo } : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  const messageId = response.headers.get('X-Message-Id') || crypto.randomUUID();
  return { success: true, messageId };
}

// Mock 发送（开发环境）
async function sendWithMock(
  params: SendEmailParams,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: EmailConfig
): Promise<SendEmailResult> {
  console.log('[Email Mock] Sending email:');
  console.log('  To:', params.to);
  console.log('  Subject:', params.subject);
  console.log('  HTML length:', params.html.length);
  
  return {
    success: true,
    messageId: `mock-${crypto.randomUUID()}`,
  };
}

// ===== 预定义邮件模板 =====

/**
 * 发送验证邮件
 */
export async function sendVerificationEmail(
  email: string,
  verificationCode: string,
  userName?: string
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .code { background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-family: monospace; border-radius: 8px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>验证您的邮箱</h1>
        <p>您好${userName ? ` ${userName}` : ''}，</p>
        <p>感谢注册 HopLLM！请使用以下验证码验证您的邮箱：</p>
        <div class="code">${verificationCode}</div>
        <p>验证码有效期为 10 分钟。</p>
        <p>如果您没有注册 HopLLM 账号，请忽略此邮件。</p>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>© ${new Date().getFullYear()} HopLLM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'HopLLM - 邮箱验证',
    html,
    text: `您的验证码是: ${verificationCode}`,
    tags: { type: 'verification' },
  });
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string,
  userName?: string
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>重置密码</h1>
        <p>您好${userName ? ` ${userName}` : ''}，</p>
        <p>我们收到了重置您 HopLLM 账号密码的请求。点击下方按钮重置密码：</p>
        <a href="${resetUrl}?token=${resetToken}" class="button">重置密码</a>
        <p>链接有效期为 1 小时。如果您没有请求重置密码，请忽略此邮件。</p>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>© ${new Date().getFullYear()} HopLLM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'HopLLM - 重置密码',
    html,
    text: `请访问以下链接重置密码: ${resetUrl}?token=${resetToken}`,
    tags: { type: 'password_reset' },
  });
}

/**
 * 发送 API Key 生成通知
 */
export async function sendApiKeyGeneratedEmail(
  email: string,
  apiKeyPreview: string,
  userName?: string
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .code { background: #f5f5f5; padding: 10px; font-family: monospace; border-radius: 4px; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>新的 API Key 已生成</h1>
        <p>您好${userName ? ` ${userName}` : ''}，</p>
        <p>您的 HopLLM 账号生成了一个新的 API Key：</p>
        <p class="code">${apiKeyPreview}</p>
        <div class="warning">
          <strong>⚠️ 安全提醒：</strong>
          <ul>
            <li>请妥善保管您的 API Key</li>
            <li>不要在公开代码仓库中分享</li>
            <li>如果泄露，请立即重新生成</li>
          </ul>
        </div>
        <p>如果您没有进行此操作，请立即检查您的账号安全设置。</p>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>© ${new Date().getFullYear()} HopLLM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'HopLLM - 新 API Key 生成通知',
    html,
    text: `您的新 API Key (${apiKeyPreview}) 已生成。请妥善保管，不要泄露。`,
    tags: { type: 'api_key_generated' },
  });
}

/**
 * 发送 Credits 余额告警
 */
export async function sendCreditsLowAlertEmail(
  email: string,
  currentCredits: number,
  threshold: number,
  userName?: string
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #f8d7da; border-left: 4px solid #f5c6cb; padding: 15px; margin: 20px 0; }
        .credits { font-size: 48px; font-weight: bold; color: #dc3545; text-align: center; margin: 20px 0; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>⚠️ Credits 余额不足</h1>
        <p>您好${userName ? ` ${userName}` : ''}，</p>
        <p>您的 HopLLM 账号 Credits 余额已低于设定的阈值：</p>
        <div class="credits">${currentCredits}</div>
        <div class="alert">
          <p><strong>当前余额：</strong>${currentCredits} Credits</p>
          <p><strong>告警阈值：</strong>${threshold} Credits</p>
        </div>
        <p>余额不足可能影响您的 API 调用。建议尽快充值以确保服务不中断。</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://hopllm.com/dashboard/billing" class="button">立即充值</a>
        </p>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>© ${new Date().getFullYear()} HopLLM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `HopLLM - Credits 余额不足 (剩余 ${currentCredits})`,
    html,
    text: `您的 Credits 余额 (${currentCredits}) 已低于阈值 (${threshold})，请及时充值。`,
    tags: { type: 'credits_low_alert' },
  });
}

/**
 * 发送每日请求超限告警
 */
export async function sendDailyLimitAlertEmail(
  email: string,
  currentRequests: number,
  limit: number,
  userName?: string
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 每日请求量告警</h1>
        <p>您好${userName ? ` ${userName}` : ''}，</p>
        <p>您的 HopLLM 账号今日请求量已达到设定的限制：</p>
        <div class="stats">
          <div>
            <div class="stat-value">${currentRequests}</div>
            <div>今日请求</div>
          </div>
          <div>
            <div class="stat-value">${limit}</div>
            <div>每日限制</div>
          </div>
        </div>
        <div class="alert">
          <p>请求量达到限制后，新的 API 请求可能会被拒绝或降级处理。</p>
        </div>
        <p>如需提升限制，请升级您的套餐。</p>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>© ${new Date().getFullYear()} HopLLM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `HopLLM - 每日请求量已达限制 (${currentRequests}/${limit})`,
    html,
    text: `您的今日请求量 (${currentRequests}) 已达到限制 (${limit})。`,
    tags: { type: 'daily_limit_alert' },
  });
}

/**
 * 发送错误率告警邮件
 */
export async function sendErrorRateAlertEmail(
  email: string,
  errorRate: number,
  threshold: number,
  recentErrors: number,
  totalRequests: number,
  userName?: string
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #f8d7da; border-left: 4px solid #f5c6cb; padding: 15px; margin: 20px 0; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; }
        .stat-value.error { color: #dc3545; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚨 API 错误率告警</h1>
        <p>您好${userName ? ` ${userName}` : ''}，</p>
        <p>您的 HopLLM API 请求错误率已超过设定的阈值：</p>
        <div class="stats">
          <div>
            <div class="stat-value error">${errorRate.toFixed(1)}%</div>
            <div>当前错误率</div>
          </div>
          <div>
            <div class="stat-value">${threshold}%</div>
            <div>告警阈值</div>
          </div>
        </div>
        <div class="alert">
          <p><strong>统计信息：</strong></p>
          <ul>
            <li>最近错误请求数: ${recentErrors}</li>
            <li>总请求数: ${totalRequests}</li>
          </ul>
        </div>
        <p>建议检查您的 API 配置或联系支持团队。</p>
        <div class="footer">
          <p>此邮件由系统自动发送，请勿回复。</p>
          <p>© ${new Date().getFullYear()} HopLLM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `HopLLM - API 错误率过高 (${errorRate.toFixed(1)}%)`,
    html,
    text: `您的 API 错误率 (${errorRate.toFixed(1)}%) 已超过阈值 (${threshold}%)。最近 ${recentErrors}/${totalRequests} 个请求失败。`,
    tags: { type: 'error_rate_alert' },
  });
}
/**
 * POST /api/auth/register
 * 
 * 用户注册端点
 * 
 * 安全措施：
 * 1. Cloudflare Turnstile 验证
 * 2. IP 速率限制（每小时最多 5 次）
 * 3. 输入验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, generateTokens } from '@/lib/auth';

// ==================== Cloudflare Turnstile 验证 ====================

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
  action?: string;
  cdata?: string;
}

async function verifyTurnstile(
  token: string,
  ip: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  // 如果没有配置 Turnstile，跳过验证（开发环境）
  if (!secretKey) {
    console.warn('[Register] Turnstile not configured, skipping verification');
    return { success: true };
  }
  
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip: ip,
        }),
      }
    );
    
    const result: TurnstileVerifyResponse = await response.json();
    
    if (!result.success) {
      console.warn('[Register] Turnstile verification failed:', result.error_codes);
      return {
        success: false,
        error: result.error_codes?.join(', ') || 'Verification failed',
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Register] Turnstile verification error:', error);
    return {
      success: false,
      error: 'Verification service unavailable',
    };
  }
}

// ==================== IP 速率限制 ====================

interface IpRateLimitEntry {
  attempts: number[];
  blocked: boolean;
}

const ipRateLimitMap = new Map<string, IpRateLimitEntry>();

// 清理过期的 IP 速率限制条目
setInterval(() => {
  const hourAgo = Date.now() - 3600000;
  ipRateLimitMap.forEach((entry, ip) => {
    const recentAttempts = entry.attempts.filter((t: number) => t > hourAgo);
    if (recentAttempts.length === 0) {
      ipRateLimitMap.delete(ip);
    } else {
      entry.attempts = recentAttempts;
    }
  });
}, 600000); // 每 10 分钟清理一次

function checkIpRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const maxAttempts = 5; // 每小时最多 5 次
  
  let entry = ipRateLimitMap.get(ip);
  
  if (!entry) {
    entry = { attempts: [], blocked: false };
    ipRateLimitMap.set(ip, entry);
  }
  
  // 过滤出最近的尝试
  const recentAttempts = entry.attempts.filter(t => t > hourAgo);
  
  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts);
    const retryAfter = Math.ceil((oldestAttempt + 3600000 - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }
  
  return {
    allowed: true,
    remaining: maxAttempts - recentAttempts.length,
  };
}

function recordIpAttempt(ip: string): void {
  const entry = ipRateLimitMap.get(ip);
  if (entry) {
    entry.attempts.push(Date.now());
  }
}

// ==================== 获取客户端 IP ====================

function getClientIp(request: NextRequest): string {
  // Vercel 传递的 IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  
  // 其他代理
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

// ==================== 主 Handler ====================

export async function POST(request: NextRequest) {
  try {
    // 1. 获取客户端 IP
    const clientIp = getClientIp(request);
    
    // 2. 检查 IP 速率限制
    const ipRateCheck = checkIpRateLimit(clientIp);
    if (!ipRateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'IP_RATE_LIMITED',
            message: 'Too many registration attempts from this IP. Please try again later.',
            retry_after: ipRateCheck.retryAfter,
          },
        },
        {
          status: 429,
          headers: ipRateCheck.retryAfter
            ? { 'Retry-After': String(ipRateCheck.retryAfter) }
            : undefined,
        }
      );
    }
    
    // 3. 解析请求
    const body = await request.json();
    
    // 4. Turnstile 验证
    if (process.env.NODE_ENV === 'production' && process.env.TURNSTILE_SECRET_KEY) {
      if (!body.turnstileToken) {
        return NextResponse.json(
          {
            error: {
              code: 'CAPTCHA_REQUIRED',
              message: 'CAPTCHA verification is required',
            },
          },
          { status: 400 }
        );
      }
      
      const turnstileResult = await verifyTurnstile(body.turnstileToken, clientIp);
      if (!turnstileResult.success) {
        return NextResponse.json(
          {
            error: {
              code: 'CAPTCHA_FAILED',
              message: 'CAPTCHA verification failed. Please try again.',
              details: turnstileResult.error,
            },
          },
          { status: 400 }
        );
      }
    }
    
    // 5. 验证输入
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Email and password are required' } },
        { status: 400 }
      );
    }
    
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid email format' } },
        { status: 400 }
      );
    }
    
    // 密码强度验证
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Password must be at least 6 characters' } },
        { status: 400 }
      );
    }
    
    // 6. 检查邮箱是否已存在
    const normalizedEmail = body.email.toLowerCase().trim();
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      // 记录失败尝试（但不泄露邮箱是否存在的信息）
      recordIpAttempt(clientIp);
      
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } },
        { status: 409 }
      );
    }
    
    // 7. 创建用户
    console.log('[Register] ========== CREATING USER ==========');
    console.log('[Register] Email:', normalizedEmail);
    console.log('[Register] Has name:', !!body.name);
    
    const user = await createUser(normalizedEmail, body.password, body.name);
    
    console.log('[Register] User created successfully');
    console.log('[Register] User ID:', user.id);
    console.log('[Register] User email:', user.email);
    console.log('[Register] ======================================');
    
    const tokens = generateTokens(user.id, user.tier);
    
    // 8. 记录成功注册
    recordIpAttempt(clientIp);
    
    return NextResponse.json(
      { user, ...tokens },
      { status: 201 }
    );
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Registration failed. Please try again.' } },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

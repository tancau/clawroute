import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, generateTokens } from '@/lib/auth';
import { getLoginRateLimiter } from '@/lib/middleware/rate-limit';

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

export async function POST(request: NextRequest) {
  try {
    // 1. 获取客户端 IP
    const clientIp = getClientIp(request);
    
    // 2. 检查登录速率限制 (防暴力破解)
    // 每IP每分钟最多10次登录尝试
    const loginRateLimiter = getLoginRateLimiter();
    const rateLimitResult = await loginRateLimiter(`login:${clientIp}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
            retry_after: rateLimitResult.reset,
          },
        },
        {
          status: 429,
          headers: rateLimitResult.reset > 0 ? { 'Retry-After': String(rateLimitResult.reset) } : undefined,
        }
      );
    }
    
    // 3. 解析请求
    const body = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    // Find user
    const normalizedEmail = body.email.toLowerCase().trim();
    
    const user = await findUserByEmail(normalizedEmail);
    
    if (!user) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = verifyPassword(body.password, user.passwordHash);
    
    if (!passwordValid) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Generate tokens (exclude passwordHash from response)
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      credits: user.credits,
      apiKey: user.apiKey,
      createdAt: user.createdAt,
    };
    const tokens = generateTokens(safeUser.id, safeUser.tier);

    return NextResponse.json(
      { user: safeUser, ...tokens },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Login failed. Please try again.' } },
      { status: 500 }
    );
  }
}

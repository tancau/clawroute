import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, generateTokens, isUsingPostgres } from '@/lib/auth';
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
      console.log('[Login] Rate limit exceeded for IP:', clientIp);
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
    console.log('[Login] ========== LOGIN ATTEMPT ==========');
    console.log('[Login] Email:', normalizedEmail);
    console.log('[Login] Using PostgreSQL:', isUsingPostgres());
    
    const user = await findUserByEmail(normalizedEmail);
    console.log('[Login] User found:', !!user);
    
    if (!user) {
      console.log('[Login] User not found for email:', normalizedEmail);
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    console.log('[Login] User ID:', user.id);
    console.log('[Login] Stored passwordHash length:', user.passwordHash.length);
    console.log('[Login] Stored passwordHash format check (should have colon):', user.passwordHash.includes(':'));
    
    const passwordValid = verifyPassword(body.password, user.passwordHash);
    console.log('[Login] Password valid:', passwordValid);
    
    if (!passwordValid) {
      console.log('[Login] Password verification failed for user:', user.id);
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
    
    console.log('[Login] Login successful for user:', user.id);
    console.log('[Login] ====================================');

    return NextResponse.json(
      { user: safeUser, ...tokens },
      { status: 200 }
    );
  } catch (err) {
    console.error('[Login] Login error:', err);
    console.error('[Login] Error stack:', err instanceof Error ? err.stack : 'No stack');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Login failed. Please try again.' } },
      { status: 500 }
    );
  }
}

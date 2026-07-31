import { SignJWT, jwtVerify } from 'jose';

// ===== JWT Utilities =====
// 使用 jose（标准库，WebCrypto）替代自实现 HS256，消除自实现密码学风险。
// 算法显式锁定 HS256，防 alg 混淆/none 攻击；exp 由 jose 自动校验。
// 与旧实现生成的 token 互通（相同 secret → 相同 HMAC），既有会话无需失效。

/**
 * 获取 JWT 密钥（集中管理，所有代码应使用此函数）
 */
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function signJWT(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(new TextEncoder().encode(getJWTSecret()));
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ['HS256'] }
    );
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function generateTokens(userId: string, tier: string) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await signJWT({ userId, tier, iat: now, exp: now + 3600 });
  const refreshToken = await signJWT({ userId, type: 'refresh', iat: now, exp: now + 7 * 86400 });
  return { accessToken, refreshToken, expiresIn: 3600 };
}

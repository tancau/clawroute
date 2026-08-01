// @vitest-environment node
// jose v6 (WebCrypto) 在 jsdom 下存在跨 realm Uint8Array 检测问题，
// auth 测试不涉及 DOM，改用 node 环境以使用原生 WebCrypto。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getJWTSecret, generateTokens, verifyJWT } from '@/lib/auth/jwt';

describe('auth/password', () => {
  it('hashPassword produces salt:hash format', () => {
    const stored = hashPassword('s3cret');
    expect(stored).toContain(':');
    const [salt, hash] = stored.split(':');
    expect(salt!.length).toBe(32); // 16 bytes hex
    expect(hash!.length).toBeGreaterThan(0);
  });

  it('verifyPassword returns true for correct password', () => {
    const stored = hashPassword('correct-horse-battery');
    expect(verifyPassword('correct-horse-battery', stored)).toBe(true);
  });

  it('verifyPassword returns false for wrong password', () => {
    const stored = hashPassword('right-password');
    expect(verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('verifyPassword returns false for malformed stored value', () => {
    expect(verifyPassword('any', 'no-colon-here')).toBe(false);
    expect(verifyPassword('any', ':')).toBe(false);
  });

  it('hashPassword uses random salt (different outputs for same password)', () => {
    const a = hashPassword('same');
    const b = hashPassword('same');
    expect(a).not.toBe(b);
    // 两者均能验证通过
    expect(verifyPassword('same', a)).toBe(true);
    expect(verifyPassword('same', b)).toBe(true);
  });
});

describe('auth/jwt', () => {
  const SECRET = 'test-jwt-secret-very-secure';

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', SECRET);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getJWTSecret throws when JWT_SECRET unset', () => {
    vi.stubEnv('JWT_SECRET', '');
    expect(() => getJWTSecret()).toThrow(/JWT_SECRET/);
    vi.stubEnv('JWT_SECRET', SECRET);
  });

  it('getJWTSecret returns the configured secret', () => {
    expect(getJWTSecret()).toBe(SECRET);
  });

  it('generateTokens returns accessToken, refreshToken and expiresIn=3600', async () => {
    const tokens = await generateTokens('user-42', 'pro');
    expect(tokens.expiresIn).toBe(3600);
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(tokens.accessToken.split('.')).toHaveLength(3); // JWT 三段式
  });

  it('verifyJWT round-trips accessToken to original payload', async () => {
    const { accessToken } = await generateTokens('user-42', 'pro');
    const payload = await verifyJWT(accessToken, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe('user-42');
    expect(payload!.tier).toBe('pro');
  });

  it('refreshToken carries type=refresh', async () => {
    const { refreshToken } = await generateTokens('user-42', 'pro');
    const payload = await verifyJWT(refreshToken, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.type).toBe('refresh');
    expect(payload!.userId).toBe('user-42');
  });

  it('verifyJWT returns null for wrong secret', async () => {
    const { accessToken } = await generateTokens('user-42', 'pro');
    expect(await verifyJWT(accessToken, 'wrong-secret')).toBeNull();
  });

  it('verifyJWT returns null for malformed token', async () => {
    expect(await verifyJWT('not.a.valid.jwt', SECRET)).toBeNull();
  });

  it('verifyJWT returns null for expired token', async () => {
    vi.useFakeTimers();
    const { accessToken } = await generateTokens('user-42', 'pro');
    // 推进 2 小时，超过 1 小时 exp
    vi.advanceTimersByTime(2 * 3600 * 1000);
    expect(await verifyJWT(accessToken, SECRET)).toBeNull();
  });
});

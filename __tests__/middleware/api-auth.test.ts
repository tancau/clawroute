// @vitest-environment node
// api-auth 依赖 next/server（NextRequest）与 @/lib/auth（jose WebCrypto），
// 强制 node 环境以使用原生 WebCrypto，避免 jsdom 跨 realm 问题。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { AuthResult } from '@/lib/middleware/api-auth';

// 桩 @/lib/auth：控制 verifyJWT / findUserByApiKey / getJWTSecret 的返回值
const verifyJWT = vi.fn();
const findUserByApiKey = vi.fn();
const getJWTSecret = vi.fn(() => 'test-jwt-secret');

vi.mock('@/lib/auth', () => ({
  verifyJWT,
  findUserByApiKey,
  getJWTSecret,
}));

let mod: typeof import('@/lib/middleware/api-auth');

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  getJWTSecret.mockReturnValue('test-jwt-secret');
  mod = await import('@/lib/middleware/api-auth');
});

function makeRequest(
  url: string,
  opts: { authHeader?: string; cookieToken?: string } = {}
): NextRequest {
  const headers = new Headers();
  if (opts.authHeader) headers.set('authorization', `Bearer ${opts.authHeader}`);
  if (opts.cookieToken) headers.set('cookie', `accessToken=${opts.cookieToken}`);
  return new NextRequest(`http://localhost${url}`, { method: 'GET', headers });
}

describe('api-auth — 路径分类', () => {
  it('isPublicPath 识别公共路径', () => {
    expect(mod.isPublicPath('/api/v1/ping')).toBe(true);
    expect(mod.isPublicPath('/api/health')).toBe(true);
    expect(mod.isPublicPath('/api/health/db')).toBe(true);
  });

  it('isPublicPath 对受保护路径返回 false', () => {
    expect(mod.isPublicPath('/api/v1/chat/completions')).toBe(false);
    expect(mod.isPublicPath('/api/dashboard/usage')).toBe(false);
    expect(mod.isPublicPath('/api/admin/users')).toBe(false);
  });

  it('isOptionalAuthPath 识别可选认证路径', () => {
    expect(mod.isOptionalAuthPath('/api/v1/chat/completions')).toBe(true);
  });

  it('isOptionalAuthPath 对其他路径返回 false', () => {
    expect(mod.isOptionalAuthPath('/api/dashboard/usage')).toBe(false);
    expect(mod.isOptionalAuthPath('/api/v1/ping')).toBe(false);
  });
});

describe('api-auth — authenticateApiRequest（public）', () => {
  it('公共路径无需认证，type=public', async () => {
    const req = makeRequest('/api/v1/ping');
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(true);
    expect(result.type).toBe('public');
    // 不应调用任何认证函数
    expect(verifyJWT).not.toHaveBeenCalled();
    expect(findUserByApiKey).not.toHaveBeenCalled();
  });

  it('健康检查路径无需认证', async () => {
    for (const p of ['/api/health', '/api/health/db']) {
      const req = makeRequest(p);
      const result = await mod.authenticateApiRequest(req);
      expect(result.authenticated).toBe(true);
      expect(result.type).toBe('public');
    }
  });
});

describe('api-auth — authenticateApiRequest（无 token）', () => {
  it('受保护路径无 token → 拒绝并返回错误信息', async () => {
    const req = makeRequest('/api/dashboard/usage');
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/Authentication required/);
  });

  it('可选认证路径无 token → 放行，type=optional，tier=free', async () => {
    const req = makeRequest('/api/v1/chat/completions');
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(true);
    expect(result.type).toBe('optional');
    expect(result.tier).toBe('free');
  });
});

describe('api-auth — authenticateApiRequest（JWT）', () => {
  it('有效 JWT → 认证成功，type=jwt，携带 userId/tier', async () => {
    verifyJWT.mockResolvedValue({ userId: 'user-1', tier: 'pro' });
    const req = makeRequest('/api/dashboard/usage', { authHeader: 'valid.jwt.token' });
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(true);
    expect(result.type).toBe('jwt');
    expect(result.userId).toBe('user-1');
    expect(result.tier).toBe('pro');
    expect(verifyJWT).toHaveBeenCalledWith('valid.jwt.token', 'test-jwt-secret');
    // JWT 成功后不应再查 API Key
    expect(findUserByApiKey).not.toHaveBeenCalled();
  });

  it('JWT 缺少 userId → 视为无效，回退 API Key 查询', async () => {
    verifyJWT.mockResolvedValue({ /* 无 userId */ });
    findUserByApiKey.mockResolvedValue(null);
    const req = makeRequest('/api/dashboard/usage', { authHeader: 'weird.jwt' });
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(false);
    expect(findUserByApiKey).toHaveBeenCalledWith('weird.jwt');
  });

  it('Cookie 中的 accessToken 同样可用于 JWT 认证', async () => {
    verifyJWT.mockResolvedValue({ userId: 'cookie-user', tier: 'team' });
    const req = makeRequest('/api/dashboard/usage', { cookieToken: 'cookie.jwt.token' });
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(true);
    expect(result.type).toBe('jwt');
    expect(result.userId).toBe('cookie-user');
    expect(result.tier).toBe('team');
  });
});

describe('api-auth — authenticateApiRequest（API Key）', () => {
  it('JWT 无效但 API Key 有效 → 认证成功，type=api_key', async () => {
    verifyJWT.mockResolvedValue(null);
    findUserByApiKey.mockResolvedValue({ id: 'api-user', tier: 'enterprise' });
    const req = makeRequest('/api/dashboard/usage', { authHeader: 'hl-validapikey' });
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(true);
    expect(result.type).toBe('api_key');
    expect(result.userId).toBe('api-user');
    expect(result.tier).toBe('enterprise');
  });

  it('JWT 与 API Key 均无效 → 受保护路径拒绝', async () => {
    verifyJWT.mockResolvedValue(null);
    findUserByApiKey.mockResolvedValue(null);
    const req = makeRequest('/api/dashboard/usage', { authHeader: 'bogus-token' });
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(false);
    expect(result.error).toMatch(/Invalid token or API key/);
  });

  it('JWT 与 API Key 均无效 → 可选路径仍放行（type=optional）', async () => {
    verifyJWT.mockResolvedValue(null);
    findUserByApiKey.mockResolvedValue(null);
    const req = makeRequest('/api/v1/chat/completions', { authHeader: 'bogus-token' });
    const result = await mod.authenticateApiRequest(req);
    expect(result.authenticated).toBe(true);
    expect(result.type).toBe('optional');
    expect(result.tier).toBe('free');
  });
});

describe('api-auth — unauthorizedResponse', () => {
  it('返回 401 与统一错误结构', async () => {
    const resp = mod.unauthorizedResponse('custom reason');
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('custom reason');
  });

  it('无消息时使用默认文案', async () => {
    const resp = mod.unauthorizedResponse();
    const body = await resp.json();
    expect(body.error.message).toMatch(/Authentication required/);
  });
});

describe('api-auth — withApiAuth 包装器', () => {
  it('未认证 → 直接返回 401，不调用 handler', async () => {
    verifyJWT.mockResolvedValue(null);
    findUserByApiKey.mockResolvedValue(null);
    const handler = vi.fn(async (_req: NextRequest, _auth: AuthResult) =>
      NextResponse.json({ ok: true })
    );
    const wrapped = mod.withApiAuth(handler);
    const req = makeRequest('/api/dashboard/usage', { authHeader: 'bad' });
    const resp = await wrapped(req);
    expect(resp.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('已认证 → 调用 handler 并传入 auth 结果', async () => {
    verifyJWT.mockResolvedValue({ userId: 'u1', tier: 'pro' });
    const handler = vi.fn(
      async (_req: NextRequest, auth: AuthResult) =>
        NextResponse.json({ userId: auth.userId, tier: auth.tier })
    );
    const wrapped = mod.withApiAuth(handler);
    const req = makeRequest('/api/dashboard/usage', { authHeader: 'valid.jwt' });
    const resp = await wrapped(req);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.userId).toBe('u1');
    expect(body.tier).toBe('pro');
    // handler 收到的 auth 与 authenticateApiRequest 结果一致
    const passedAuth = handler.mock.calls[0]![1] as AuthResult;
    expect(passedAuth.type).toBe('jwt');
  });

  it('公共路径 → 放行并传 type=public', async () => {
    const handler = vi.fn(async (_req: NextRequest, _auth: AuthResult) =>
      NextResponse.json({ ok: true })
    );
    const wrapped = mod.withApiAuth(handler);
    const req = makeRequest('/api/v1/ping');
    const resp = await wrapped(req);
    expect(resp.status).toBe(200);
    expect(handler).toHaveBeenCalled();
    const passedAuth = handler.mock.calls[0]![1] as AuthResult;
    expect(passedAuth.type).toBe('public');
  });
});

// 辅助：next/server 的 NextResponse 在 node 环境可用（import 已在文件顶部）

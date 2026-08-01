import { test, expect } from '@playwright/test';

/**
 * 安全头与 CSP nonce 端到端验证（CSP nonce Step 2 的回归保护）。
 *
 * 关键不变量：单次请求中，响应头 CSP 的 nonce 必须与 HTML 内所有
 * <script> 标签的 nonce 完全一致，否则脚本会被浏览器阻断（白屏）。
 */
test.describe('安全头 / CSP nonce', () => {
  test('/en 响应包含 CSP nonce + strict-dynamic，且 script-src 无 unsafe-inline', async ({ request }) => {
    const resp = await request.get('/en');
    const csp = resp.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    if (!csp) throw new Error('Missing content-security-policy header');
    expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]+/);
    expect(csp).toContain("'strict-dynamic'");
    // script-src 不应包含 'unsafe-inline'（dev/prod 均不含；dev 仅多 'unsafe-eval'）
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) || '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  test('/en 包含基础安全头', async ({ request }) => {
    const resp = await request.get('/en');
    const h = resp.headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('所有 <script> 标签携带与 CSP 一致的 nonce（无白屏风险）', async ({ request }) => {
    const resp = await request.get('/en');
    const csp = resp.headers()['content-security-policy'] || '';
    const cspNonceMatch = csp.match(/nonce-([A-Za-z0-9+/=]+)/);
    expect(cspNonceMatch, 'CSP 必须包含 nonce').toBeTruthy();
    const cspNonce = cspNonceMatch![1];

    const html = await resp.text();
    const scriptTags = html.match(/<script[^>]*>/g) || [];
    expect(scriptTags.length, '页面应至少有一个 script 标签').toBeGreaterThan(0);

    for (const tag of scriptTags) {
      expect(tag, `脚本标签缺少与 CSP 一致的 nonce: ${tag.slice(0, 80)}`).toContain(
        `nonce="${cspNonce}"`,
      );
    }
  });

  test('API 路由不带 CSP（仅页面需要）', async ({ request }) => {
    const resp = await request.get('/api/health');
    const csp = resp.headers()['content-security-policy'];
    // API 响应不渲染 HTML，无需 CSP（中间件对 /api 分支不设置 CSP）
    expect(csp).toBeFalsy();
  });
});

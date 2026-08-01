import { test, expect } from '@playwright/test';

/**
 * 认证边界 —— 登录/注册页渲染、未授权访问不崩溃。
 */
test.describe('认证页面', () => {
  test('登录页渲染表单元素', async ({ page }) => {
    const resp = await page.goto('/en/auth/login');
    expect(resp?.status()).toBe(200);
    // 登录表单至少包含一个输入框
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 });
  });

  test('注册页渲染表单元素', async ({ page }) => {
    const resp = await page.goto('/en/auth/register');
    expect(resp?.status()).toBe(200);
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 });
  });

  test('未登录访问 dashboard 不返回 5xx（客户端鉴权，shell 应正常渲染）', async ({ page }) => {
    const resp = await page.goto('/en/dashboard');
    expect(resp?.status()).toBeLessThan(500);
  });

  test('未登录访问 admin 不返回 5xx', async ({ page }) => {
    const resp = await page.goto('/en/admin');
    expect(resp?.status()).toBeLessThan(500);
  });
});

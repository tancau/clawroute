import { test, expect } from '@playwright/test';

/**
 * 冒烟测试 —— 关键页面可访问、可渲染。
 * 不依赖数据库（应用在 DB 不可用时优雅降级）。
 */
test.describe('冒烟：关键页面', () => {
  test('首页 / 重定向到本地化路径', async ({ page }) => {
    const resp = await page.goto('/');
    // next-intl localePrefix: 'always' → 重定向到默认语言路径
    expect(resp?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/(en|zh)(\/|$|\?)/);
  });

  test('/en 首页渲染标题', async ({ page }) => {
    const resp = await page.goto('/en');
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveTitle(/HopLLM|智跳/i);
  });

  test('/en/pricing 定价页可访问', async ({ page }) => {
    const resp = await page.goto('/en/pricing');
    expect(resp?.status()).toBe(200);
  });

  test('/en/docs 文档页可访问', async ({ page }) => {
    const resp = await page.goto('/en/docs');
    expect(resp?.status()).toBe(200);
  });

  test('/en/about 关于页可访问', async ({ page }) => {
    const resp = await page.goto('/en/about');
    expect(resp?.status()).toBe(200);
  });
});

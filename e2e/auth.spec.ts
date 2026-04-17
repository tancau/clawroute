import { test, expect } from '@playwright/test';

test.describe('ClawRouter E2E Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('http://localhost:3003');
    await expect(page).toHaveTitle(/ClawRoute/);
    // Check the main heading is visible
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should load login page', async ({ page }) => {
    await page.goto('http://localhost:3003/en/auth/login');
    await expect(page.locator('h1')).toContainText('欢迎回来');
    await expect(page.locator('#email')).toBeVisible();
    await page.locator('#password').isVisible();
  });

  test('should load register page', async ({ page }) => {
    await page.goto('http://localhost:3003/en/auth/register');
    await expect(page.locator('h1')).toContainText('创建账户');
    await expect(page.locator('#email')).toBeVisible();
    await page.locator('#password').isVisible();
    await page.locator('#confirmPassword').isVisible();
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('http://localhost:3003/en/auth/login');
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for loading to complete and check for any error (red box)
    await page.waitForTimeout(3000);
    await expect(page.locator('.bg-red-500\\/10, [class*="red-500"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show error on password mismatch in register', async ({ page }) => {
    await page.goto('http://localhost:3003/en/auth/register');
    await page.fill('#email', 'newuser@test.com');
    await page.fill('#password', 'Test123456');
    await page.fill('#confirmPassword', 'DifferentPassword');
    await page.click('button[type="submit"]');
    
    // Should show error message (red box)
    await expect(page.locator('.bg-red-500\\/10, [class*="red-500"]')).toBeVisible();
  });

  test('should register and login a new user', async ({ page }) => {
    const uniqueEmail = `test${Date.now()}@example.com`;
    
    // Register
    await page.goto('http://localhost:3003/en/auth/register');
    await page.fill('#name', 'Test User');
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'Test123456');
    await page.fill('#confirmPassword', 'Test123456');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    
    // Verify we're on dashboard
    await expect(page).toHaveURL(/dashboard/);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'e2e/screenshots/dashboard.png' });
  });
});

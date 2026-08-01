import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 配置
 *
 * 资源受限服务器的取舍：
 * - workers=1 + fullyParallel=false：串行执行，避免并发编译/渲染打满内存
 * - webServer 使用 `next start`（生产模式）：真实鉴权/CSP 行为，且无 dev 按需编译抖动
 * - 需先执行 `next build`；CI 用 `npm run test:e2e:full`（先 build 再测）
 * - 单 chromium project，headless，使用系统 Google Chrome（服务器无外网下载 bundled）
 *
 * 运行：npm run test:e2e        （假定 .next 已构建）
 *       npm run test:e2e:full  （先 build 再测，CI/全新环境用）
 */
const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // 统一 accept-language，保证首页重定向目标稳定（默认 en）
    locale: 'en-US',
    // 服务器无外网下载 bundled chromium，使用系统 Google Chrome；
    // --no-sandbox 适配容器/非交互运行环境
    channel: 'chrome',
    launchOptions: { args: ['--no-sandbox', '--disable-gpu'] },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 60_000,
    env: {
      NODE_OPTIONS: '--max-old-space-size=512',
    },
  },
});

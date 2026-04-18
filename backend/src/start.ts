import { serve } from '@hono/node-server';
import app from './api/server';
import { modelSyncScheduler } from './sync/scheduler';

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 ClawRouter API running on http://localhost:${port}`);

// 启动模型目录定时同步
modelSyncScheduler.start();

// 优雅关闭
process.on('SIGINT', () => {
  modelSyncScheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  modelSyncScheduler.stop();
  process.exit(0);
});

serve({
  fetch: app.fetch,
  port,
});

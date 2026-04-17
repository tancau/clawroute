import { serve } from '@hono/node-server';
import app from './api/server';

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 ClawRouter API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

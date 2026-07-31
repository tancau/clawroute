import { NextResponse } from 'next/server';
import { isDbHealthy } from '@/lib/db/client';

/**
 * Readiness probe — 依赖可用才返回 200，否则 503。
 * 编排器据此决定是否路由流量。
 *
 * 语义：
 * - 未配置数据库（POSTGRES_URL/DATABASE_URL 缺失）：运行于内存降级模式，视为就绪。
 * - 已配置但不可达：未就绪（503），等待恢复后重新承接流量。
 */
function isDbConfigured(): boolean {
  return Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL
  );
}

export async function GET() {
  const dbConfigured = isDbConfigured();
  const dbOk = dbConfigured ? await isDbHealthy() : true;
  const ready = dbOk;

  return NextResponse.json(
    {
      ready,
      checks: {
        database: dbOk ? 'up' : 'down',
        mode: dbConfigured ? 'postgres' : 'memory',
      },
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}

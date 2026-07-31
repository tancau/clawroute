import { NextResponse } from 'next/server';
import { isDbHealthy } from '@/lib/db/client';

/**
 * 数据库连通性检查。
 * 复用统一数据访问层 isDbHealthy()，避免重复 @vercel/postgres 直连与 console 日志。
 */
export async function GET() {
  const healthy = await isDbHealthy();
  return NextResponse.json(
    {
      status: healthy ? 'connected' : 'unavailable',
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}

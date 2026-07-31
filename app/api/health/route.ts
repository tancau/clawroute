/**
 * Liveness probe — 进程存活即返回 200。
 *
 * 刻意不检查任何依赖（DB/Redis）：依赖抖动不应导致 Pod 被重启，
 * 那类故障由 readiness probe（/api/ready）表达。
 */
import { NextResponse } from 'next/server';
import pkg from '@/package.json';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: pkg.name,
    version: pkg.version,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/dashboard/health
 * 获取 Provider 健康度数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, getJWTSecret } from '@/lib/auth';
import { getProviderHealthSummary } from '@/lib/provider-health';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyJWT(token, getJWTSecret());
  if (!payload?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = getProviderHealthSummary();

  return NextResponse.json({
    success: true,
    data: summary,
  });
}

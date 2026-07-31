/**
 * GET /api/dashboard/budget
 * 获取预算状态
 * POST /api/dashboard/budget
 * 设置预算配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, getJWTSecret } from '@/lib/auth';
import { getBudgetConfig, setBudgetConfig, getBudgetStatus, BudgetConfig } from '@/lib/budget-guard';

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyJWT(token, getJWTSecret());
  if (!payload?.userId) return null;
  return { userId: payload.userId as string };
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [config, status] = await Promise.all([
    getBudgetConfig(auth.userId),
    getBudgetStatus(auth.userId),
  ]);

  return NextResponse.json({
    success: true,
    config: {
      monthlyLimitUsd: config.monthlyLimitUsd,
      warningThreshold: config.warningThreshold,
      downgradeThreshold: config.downgradeThreshold,
      blockThreshold: config.blockThreshold,
      downgradeToFree: config.downgradeToFree,
      notifyOnWarning: config.notifyOnWarning,
      webhookUrl: config.webhookUrl,
    },
    status: {
      currentSpendUsd: status.currentSpendUsd,
      monthlyLimitUsd: status.monthlyLimitUsd,
      usagePercent: status.usagePercent,
      projectedSpendUsd: status.projectedSpendUsd,
      daysRemaining: status.daysRemaining,
      dailyAvgSpendUsd: status.dailyAvgSpendUsd,
      status: status.status,
      modelTier: status.modelTier,
      nextThreshold: status.nextThreshold,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // 验证
  if (body.monthlyLimitUsd !== undefined && body.monthlyLimitUsd < 0) {
    return NextResponse.json({ error: 'monthlyLimitUsd must be >= 0' }, { status: 400 });
  }
  if (body.warningThreshold !== undefined && (body.warningThreshold < 0 || body.warningThreshold > 1)) {
    return NextResponse.json({ error: 'warningThreshold must be between 0 and 1' }, { status: 400 });
  }

  const existing = await getBudgetConfig(auth.userId);
  const config: BudgetConfig = {
    userId: auth.userId,
    monthlyLimitUsd: body.monthlyLimitUsd ?? existing.monthlyLimitUsd,
    warningThreshold: body.warningThreshold ?? existing.warningThreshold,
    downgradeThreshold: body.downgradeThreshold ?? existing.downgradeThreshold,
    blockThreshold: body.blockThreshold ?? existing.blockThreshold,
    downgradeToFree: body.downgradeToFree ?? existing.downgradeToFree,
    notifyOnWarning: body.notifyOnWarning ?? existing.notifyOnWarning,
    webhookUrl: body.webhookUrl ?? existing.webhookUrl,
  };

  await setBudgetConfig(config);

  return NextResponse.json({
    success: true,
    message: 'Budget configuration saved',
    config: {
      monthlyLimitUsd: config.monthlyLimitUsd,
      warningThreshold: config.warningThreshold,
      downgradeThreshold: config.downgradeThreshold,
      blockThreshold: config.blockThreshold,
      downgradeToFree: config.downgradeToFree,
    },
  });
}

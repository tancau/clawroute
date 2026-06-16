/**
 * 预算守护系统
 * 
 * 功能：
 * 1. 月度预算设置与追踪
 * 2. 接近阈值时自动降级模型
 * 3. 超预算时阻止请求或强制使用免费模型
 * 4. 预算消耗预测
 */

import { sql } from '@vercel/postgres';

// ==================== 类型定义 ====================

export interface BudgetConfig {
  userId: string;
  monthlyLimitUsd: number;       // 月度预算上限（美元）
  warningThreshold: number;       // 警告阈值（0-1，如 0.8 = 80%）
  downgradeThreshold: number;     // 降级阈值（0-1，如 0.9 = 90%）
  blockThreshold: number;         // 阻止阈值（0-1，如 1.0 = 100%）
  downgradeToFree: boolean;       // 超过降级阈值后是否只使用免费模型
  notifyOnWarning: boolean;       // 是否在达到警告阈值时通知
  webhookUrl?: string;            // 预算告警 Webhook URL
}

export interface BudgetStatus {
  userId: string;
  monthlyLimitUsd: number;
  currentSpendUsd: number;
  usagePercent: number;           // 0-100
  projectedSpendUsd: number;      // 预计月末花费
  daysRemaining: number;
  dailyAvgSpendUsd: number;
  status: 'normal' | 'warning' | 'downgraded' | 'blocked';
  nextThreshold: number;          // 下一个阈值百分比
  modelTier: 'full' | 'cheap' | 'free';  // 当前允许的模型级别
}

export interface BudgetAlert {
  type: 'warning' | 'downgrade' | 'block' | 'unblock';
  message: string;
  usagePercent: number;
  monthlyLimit: number;
  currentSpend: number;
  timestamp: number;
}

// ==================== 默认配置 ====================

const DEFAULT_BUDGET: Omit<BudgetConfig, 'userId'> = {
  monthlyLimitUsd: 0,             // 0 = 无限制
  warningThreshold: 0.8,
  downgradeThreshold: 0.9,
  blockThreshold: 1.0,
  downgradeToFree: true,
  notifyOnWarning: true,
};

// 内存缓存（数据库不可用时使用）
const budgetCache = new Map<string, BudgetConfig>();

// ==================== 数据库操作 ====================

async function getSql() {
  try {
    const { sql } = await import('@vercel/postgres');
    await sql`SELECT 1`;
    return sql;
  } catch {
    return null;
  }
}

async function ensureBudgetTable() {
  const db = await getSql();
  if (!db) return;

  try {
    await db`
      CREATE TABLE IF NOT EXISTS user_budgets (
        user_id TEXT PRIMARY KEY,
        monthly_limit_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
        warning_threshold DECIMAL(3, 2) NOT NULL DEFAULT 0.80,
        downgrade_threshold DECIMAL(3, 2) NOT NULL DEFAULT 0.90,
        block_threshold DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
        downgrade_to_free BOOLEAN NOT NULL DEFAULT true,
        notify_on_warning BOOLEAN NOT NULL DEFAULT true,
        webhook_url TEXT,
        updated_at INTEGER NOT NULL
      )
    `;
  } catch {
    // 静默处理
  }
}

export async function getBudgetConfig(userId: string): Promise<BudgetConfig> {
  // 先查内存缓存
  const cached = budgetCache.get(userId);
  if (cached) return cached;

  const db = await getSql();
  if (db) {
    try {
      await ensureBudgetTable();
      const result = await db`
        SELECT * FROM user_budgets WHERE user_id = ${userId}
      `;
      if (result.rows.length > 0) {
        const row = result.rows[0]!;
        const config: BudgetConfig = {
          userId,
          monthlyLimitUsd: parseFloat(row.monthly_limit_usd as string) || 0,
          warningThreshold: parseFloat(row.warning_threshold as string) || 0.8,
          downgradeThreshold: parseFloat(row.downgrade_threshold as string) || 0.9,
          blockThreshold: parseFloat(row.block_threshold as string) || 1.0,
          downgradeToFree: (row.downgrade_to_free as boolean) ?? true,
          notifyOnWarning: (row.notify_on_warning as boolean) ?? true,
          webhookUrl: (row.webhook_url as string) || undefined,
        };
        budgetCache.set(userId, config);
        return config;
      }
    } catch {
      // 降级到默认
    }
  }

  return { ...DEFAULT_BUDGET, userId };
}

export async function setBudgetConfig(config: BudgetConfig): Promise<void> {
  budgetCache.set(config.userId, config);

  const db = await getSql();
  if (db) {
    try {
      await ensureBudgetTable();
      await db`
        INSERT INTO user_budgets (
          user_id, monthly_limit_usd, warning_threshold, downgrade_threshold,
          block_threshold, downgrade_to_free, notify_on_warning, webhook_url, updated_at
        ) VALUES (
          ${config.userId},
          ${config.monthlyLimitUsd},
          ${config.warningThreshold},
          ${config.downgradeThreshold},
          ${config.blockThreshold},
          ${config.downgradeToFree},
          ${config.notifyOnWarning},
          ${config.webhookUrl || null},
          ${Date.now()}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          monthly_limit_usd = ${config.monthlyLimitUsd},
          warning_threshold = ${config.warningThreshold},
          downgrade_threshold = ${config.downgradeThreshold},
          block_threshold = ${config.blockThreshold},
          downgrade_to_free = ${config.downgradeToFree},
          notify_on_warning = ${config.notifyOnWarning},
          webhook_url = ${config.webhookUrl || null},
          updated_at = ${Date.now()}
      `;
    } catch {
      // 静默处理
    }
  }
}

// ==================== 预算状态计算 ====================

export async function getBudgetStatus(userId: string): Promise<BudgetStatus> {
  const config = await getBudgetConfig(userId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const daysRemaining = daysInMonth - daysPassed;

  // 无预算限制
  if (config.monthlyLimitUsd <= 0) {
    // 仍然查询当前花费以供展示
    const currentSpend = await getMonthlySpend(userId, monthStart);
    return {
      userId,
      monthlyLimitUsd: 0,
      currentSpendUsd: currentSpend,
      usagePercent: 0,
      projectedSpendUsd: daysPassed > 0 ? (currentSpend / daysPassed) * daysInMonth : 0,
      daysRemaining,
      dailyAvgSpendUsd: daysPassed > 0 ? currentSpend / daysPassed : 0,
      status: 'normal',
      nextThreshold: config.warningThreshold * 100,
      modelTier: 'full',
    };
  }

  const currentSpend = await getMonthlySpend(userId, monthStart);
  const usagePercent = (currentSpend / config.monthlyLimitUsd) * 100;
  const dailyAvgSpend = daysPassed > 0 ? currentSpend / daysPassed : 0;
  const projectedSpend = dailyAvgSpend * daysInMonth;

  // 确定状态和模型级别
  let status: BudgetStatus['status'] = 'normal';
  let modelTier: BudgetStatus['modelTier'] = 'full';
  let nextThreshold = config.warningThreshold * 100;

  if (usagePercent / 100 >= config.blockThreshold) {
    status = 'blocked';
    modelTier = 'free';
    nextThreshold = 100;
  } else if (usagePercent / 100 >= config.downgradeThreshold) {
    status = 'downgraded';
    modelTier = config.downgradeToFree ? 'free' : 'cheap';
    nextThreshold = config.blockThreshold * 100;
  } else if (usagePercent / 100 >= config.warningThreshold) {
    status = 'warning';
    modelTier = 'cheap';
    nextThreshold = config.downgradeThreshold * 100;
  }

  return {
    userId,
    monthlyLimitUsd: config.monthlyLimitUsd,
    currentSpendUsd: currentSpend,
    usagePercent: Math.min(usagePercent, 100),
    projectedSpendUsd: projectedSpend,
    daysRemaining,
    dailyAvgSpendUsd: dailyAvgSpend,
    status,
    nextThreshold,
    modelTier,
  };
}

async function getMonthlySpend(userId: string, monthStart: number): Promise<number> {
  const db = await getSql();
  if (!db) return 0;

  try {
    const result = await db`
      SELECT COALESCE(SUM(cost_usd), 0) as total
      FROM request_logs
      WHERE user_id = ${userId} AND created_at >= ${monthStart} AND success = true
    `;
    return parseFloat(result.rows[0]?.total as string) || 0;
  } catch {
    return 0;
  }
}

// ==================== 预算检查（路由时调用） ====================

/**
 * 检查预算状态，返回允许使用的模型级别
 * 在 routeModel 之前调用
 */
export async function checkBudgetAndGetModelTier(userId: string): Promise<{
  allowed: boolean;
  modelTier: 'full' | 'cheap' | 'free';
  status: BudgetStatus;
}> {
  const status = await getBudgetStatus(userId);

  if (status.status === 'blocked') {
    // 超预算但仍允许使用免费模型
    return { allowed: true, modelTier: 'free', status };
  }

  return {
    allowed: true,
    modelTier: status.modelTier,
    status,
  };
}

/**
 * 根据模型级别过滤模型
 */
export function filterModelsByBudgetTier(
  models: Array<{ model: string; cost: number; isFree: boolean }>,
  tier: 'full' | 'cheap' | 'free'
): Array<{ model: string; cost: number; isFree: boolean }> {
  switch (tier) {
    case 'free':
      return models.filter(m => m.isFree);
    case 'cheap':
      // 免费模型 + 低价模型（input cost < $0.5/1M tokens）
      return models.filter(m => m.isFree || m.cost < 0.5);
    case 'full':
    default:
      return models;
  }
}

/**
 * 生成预算告警
 */
export function createBudgetAlert(status: BudgetStatus): BudgetAlert | null {
  if (status.status === 'normal') return null;

  const alerts: Record<string, BudgetAlert> = {
    warning: {
      type: 'warning',
      message: `You've used ${status.usagePercent.toFixed(1)}% of your monthly budget ($${status.currentSpendUsd.toFixed(2)} / $${status.monthlyLimitUsd}). Models will be downgraded at ${status.nextThreshold.toFixed(0)}%.`,
      usagePercent: status.usagePercent,
      monthlyLimit: status.monthlyLimitUsd,
      currentSpend: status.currentSpendUsd,
      timestamp: Date.now(),
    },
    downgraded: {
      type: 'downgrade',
      message: `Budget alert: ${status.usagePercent.toFixed(1)}% used. Your requests are now routed to ${status.modelTier === 'free' ? 'free' : 'cheaper'} models only. Upgrade your budget to restore full access.`,
      usagePercent: status.usagePercent,
      monthlyLimit: status.monthlyLimitUsd,
      currentSpend: status.currentSpendUsd,
      timestamp: Date.now(),
    },
    blocked: {
      type: 'block',
      message: `Budget exceeded: ${status.usagePercent.toFixed(1)}% of $${status.monthlyLimitUsd} used. Only free models are available. Increase your budget to restore access.`,
      usagePercent: status.usagePercent,
      monthlyLimit: status.monthlyLimitUsd,
      currentSpend: status.currentSpendUsd,
      timestamp: Date.now(),
    },
  };

  return alerts[status.status] || null;
}

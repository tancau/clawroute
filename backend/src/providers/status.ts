/**
 * Provider 状态追踪系统 - Phase 2
 * 
 * 追踪各 Provider 的健康状态、延迟、成功率等指标
 */

import crypto from 'crypto';
import { db } from '../db';
import { providers, getEnabledProviders } from '../config/providers';

// ==================== Types ====================

export interface ProviderStatus {
  name: string;
  availableKeys: number;
  totalKeys: number;
  avgLatencyMs: number;
  successRate: number;
  lastError?: string;
  lastErrorAt?: number;
  isHealthy: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface ProviderMetricsUpdate {
  success: boolean;
  latencyMs: number;
  error?: string;
}

// ==================== Helper ====================

function getKeysCountForProvider(providerName: string): { total: number; active: number } {
  const allRows = db.prepare(`
    SELECT is_active FROM shared_keys WHERE provider = ?
  `).all(providerName) as any[];
  
  const active = allRows.filter(r => r.is_active === 1).length;
  return { total: allRows.length, active };
}

// ==================== Core Functions ====================

/**
 * 获取单个 Provider 状态
 */
export function getProviderStatus(providerName: string): ProviderStatus | null {
  const provider = providers.find(p => p.name === providerName);
  if (!provider) return null;

  // 获取 Key 数量
  const keyCounts = getKeysCountForProvider(providerName);

  // 从 provider_metrics 获取统计数据
  const metricsRow = db.prepare(`
    SELECT 
      total_requests,
      successful_requests,
      failed_requests,
      total_latency_ms,
      last_error,
      last_error_at,
      last_success_at,
      updated_at
    FROM provider_metrics
    WHERE provider = ?
  `).get(providerName) as any;

  const totalRequests = metricsRow?.total_requests || 0;
  const successfulRequests = metricsRow?.successful_requests || 0;
  const failedRequests = metricsRow?.failed_requests || 0;
  const totalLatencyMs = metricsRow?.total_latency_ms || 0;
  const lastError = metricsRow?.last_error || undefined;
  const lastErrorAt = metricsRow?.last_error_at || undefined;

  const avgLatencyMs = totalRequests > 0 ? Math.round(totalLatencyMs / totalRequests) : 0;
  const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 1;

  // 健康判断：
  // - 有活跃 Key
  // - 成功率 > 80%（如果至少有 10 个请求）
  // - 最近有成功记录或无失败记录
  const hasActiveKeys = keyCounts.active > 0;
  const meetsSuccessRate = totalRequests < 10 || successRate >= 0.8;
  const recentlyHealthy = !metricsRow?.last_error_at || 
    (metricsRow?.last_success_at && metricsRow.last_success_at > metricsRow.last_error_at);

  const isHealthy = hasActiveKeys && meetsSuccessRate && recentlyHealthy;

  return {
    name: providerName,
    availableKeys: keyCounts.active,
    totalKeys: keyCounts.total,
    avgLatencyMs,
    successRate: Math.round(successRate * 1000) / 1000,
    lastError,
    lastErrorAt,
    isHealthy,
    totalRequests,
    successfulRequests,
    failedRequests,
  };
}

/**
 * 检查所有 Provider 状态
 */
export function checkAllProviders(): ProviderStatus[] {
  const enabledProviders = getEnabledProviders();
  return enabledProviders
    .map(p => getProviderStatus(p.name))
    .filter((s): s is ProviderStatus => s !== null);
}

/**
 * 更新 Provider 指标
 */
export function updateProviderMetrics(
  providerName: string,
  result: ProviderMetricsUpdate
): void {
  const now = Date.now();

  // 尝试更新
  const existing = db.prepare(`
    SELECT provider FROM provider_metrics WHERE provider = ?
  `).get(providerName) as any;

  if (existing) {
    if (result.success) {
      db.prepare(`
        UPDATE provider_metrics
        SET total_requests = total_requests + 1,
            successful_requests = successful_requests + 1,
            total_latency_ms = total_latency_ms + ?,
            last_success_at = ?,
            updated_at = ?
        WHERE provider = ?
      `).run(result.latencyMs, now, now, providerName);
    } else {
      db.prepare(`
        UPDATE provider_metrics
        SET total_requests = total_requests + 1,
            failed_requests = failed_requests + 1,
            total_latency_ms = total_latency_ms + ?,
            last_error = ?,
            last_error_at = ?,
            updated_at = ?
        WHERE provider = ?
      `).run(result.latencyMs, result.error || 'Unknown error', now, now, providerName);
    }
  } else {
    // 插入新记录
    const id = crypto.randomUUID();
    if (result.success) {
      db.prepare(`
        INSERT INTO provider_metrics (id, provider, total_requests, successful_requests, failed_requests, total_latency_ms, last_success_at, updated_at)
        VALUES (?, ?, 1, 1, 0, ?, ?, ?)
      `).run(id, providerName, result.latencyMs, now, now);
    } else {
      db.prepare(`
        INSERT INTO provider_metrics (id, provider, total_requests, successful_requests, failed_requests, total_latency_ms, last_error, last_error_at, updated_at)
        VALUES (?, ?, 1, 0, 1, ?, ?, ?, ?)
      `).run(id, providerName, result.latencyMs, result.error || 'Unknown error', now, now);
    }
  }
}

/**
 * 获取 Provider 可用性排行
 */
export function getProviderRanking(): Array<{
  provider: string;
  score: number;
  successRate: number;
  avgLatencyMs: number;
}> {
  const statuses = checkAllProviders();

  return statuses
    .map(s => {
      // 综合评分: 可用Key权重40% + 成功率权重40% + 延迟权重20%
      const keyScore = s.totalKeys > 0 ? s.availableKeys / s.totalKeys : 0;
      const rateScore = s.successRate;
      const latencyScore = s.avgLatencyMs > 0 ? Math.max(0, 1 - s.avgLatencyMs / 5000) : 0.5;
      const score = keyScore * 0.4 + rateScore * 0.4 + latencyScore * 0.2;

      return {
        provider: s.name,
        score: Math.round(score * 1000) / 1000,
        successRate: s.successRate,
        avgLatencyMs: s.avgLatencyMs,
      };
    })
    .sort((a, b) => b.score - a.score);
}

import { NextResponse } from 'next/server';
import { getDb, isDbConnected } from '@/lib/db/client';
import { getProviderHealthSummary, type ProviderHealthRecord } from '@/lib/provider-health';
import { providers, modelCapabilities, getFreeModels } from '@/lib/routing/providers';

/**
 * Prometheus 指标端点（exposition format v0.0.4）。
 *
 * 暴露：
 * - 进程指标（uptime/heap/rss）
 * - 应用状态（DB 连接、provider/model 计数）
 * - provider 健康（per-provider 状态/错误率/延迟，带标签）
 * - 请求计数器（来自 request_logs，15s 缓存避免频繁扫库）
 *
 * 无新依赖：手写文本格式。生产建议通过内网/反代限制访问。
 */

const REQUEST_METRICS_TTL_MS = 15_000;

interface RequestMetrics {
  total: number;
  errors: number;
  costUsd: number;
}

let cachedRequestMetrics: RequestMetrics | null = null;
let requestMetricsExpiresAt = 0;

/**
 * 从 request_logs 聚合计数器。
 * 表名为内部受信常量（SCHEMA.TABLES.REQUEST_LOGS），@vercel/postgres 不支持表名参数化，
 * 故按 lib/db.ts 既有模式直接写入 SQL 字面量。
 */
async function getRequestMetrics(): Promise<RequestMetrics | null> {
  const now = Date.now();
  if (cachedRequestMetrics && now < requestMetricsExpiresAt) {
    return cachedRequestMetrics;
  }

  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE success = false)::bigint AS errors,
        COALESCE(SUM(cost_usd), 0)::double precision AS cost_usd
      FROM request_logs
    `;
    const row = result.rows[0] as
      | { total: string; errors: string; cost_usd: number }
      | undefined;
    if (!row) return null;

    const metrics: RequestMetrics = {
      total: Number(row.total),
      errors: Number(row.errors),
      costUsd: Number(row.cost_usd),
    };
    cachedRequestMetrics = metrics;
    requestMetricsExpiresAt = now + REQUEST_METRICS_TTL_MS;
    return metrics;
  } catch {
    // 表不存在或查询失败时返回 null，对应指标省略而非阻断整个端点
    return null;
  }
}

const STATUS_SCORE: Record<ProviderHealthRecord['status'], number> = {
  healthy: 1,
  degraded: 0.5,
  down: 0,
};

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export async function GET() {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const dbConnected = isDbConnected() ? 1 : 0;

  const providerCount = providers.length;
  const modelCount = modelCapabilities.length;
  const freeModelCount = getFreeModels().length;

  const healthSummary = getProviderHealthSummary();
  const overallHealthScore = STATUS_SCORE[healthSummary.overallStatus];

  const requestMetrics = await getRequestMetrics();

  const lines: string[] = [];

  // ===== 进程指标 =====
  lines.push('# HELP nodejs_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE nodejs_uptime_seconds counter');
  lines.push(`nodejs_uptime_seconds ${uptime}`);

  lines.push('# HELP nodejs_memory_heap_used_bytes Process heap used (bytes)');
  lines.push('# TYPE nodejs_memory_heap_used_bytes gauge');
  lines.push(`nodejs_memory_heap_used_bytes ${mem.heapUsed}`);

  lines.push('# HELP nodejs_memory_heap_total_bytes Process heap total (bytes)');
  lines.push('# TYPE nodejs_memory_heap_total_bytes gauge');
  lines.push(`nodejs_memory_heap_total_bytes ${mem.heapTotal}`);

  lines.push('# HELP nodejs_memory_rss_bytes Process resident set size (bytes)');
  lines.push('# TYPE nodejs_memory_rss_bytes gauge');
  lines.push(`nodejs_memory_rss_bytes ${mem.rss}`);

  // ===== 应用状态 =====
  lines.push('# HELP app_db_connected Whether the database is connected (1) or not (0)');
  lines.push('# TYPE app_db_connected gauge');
  lines.push(`app_db_connected ${dbConnected}`);

  lines.push('# HELP app_providers_total Number of configured providers');
  lines.push('# TYPE app_providers_total gauge');
  lines.push(`app_providers_total ${providerCount}`);

  lines.push('# HELP app_models_total Number of configured models');
  lines.push('# TYPE app_models_total gauge');
  lines.push(`app_models_total ${modelCount}`);

  lines.push('# HELP app_free_models_total Number of free models');
  lines.push('# TYPE app_free_models_total gauge');
  lines.push(`app_free_models_total ${freeModelCount}`);

  lines.push('# HELP app_provider_overall_status Overall provider health score (healthy=1, degraded=0.5, down=0)');
  lines.push('# TYPE app_provider_overall_status gauge');
  lines.push(`app_provider_overall_status ${overallHealthScore}`);

  // ===== Per-provider 健康（带标签）=====
  lines.push('# HELP app_provider_status Provider health status (healthy=1, degraded=0.5, down=0)');
  lines.push('# TYPE app_provider_status gauge');
  lines.push('# HELP app_provider_error_rate Provider error rate over recent window (0-1)');
  lines.push('# TYPE app_provider_error_rate gauge');
  lines.push('# HELP app_provider_latency_ms Provider average latency in ms over recent window');
  lines.push('# TYPE app_provider_latency_ms gauge');
  for (const p of healthSummary.providers) {
    const label = `{provider="${escapeLabelValue(p.provider)}"}`;
    lines.push(`app_provider_status${label} ${STATUS_SCORE[p.status]}`);
    lines.push(`app_provider_error_rate${label} ${p.errorRate}`);
    lines.push(`app_provider_latency_ms${label} ${p.latencyMs}`);
  }

  // ===== 请求计数器（来自 request_logs）=====
  if (requestMetrics) {
    lines.push('# HELP app_requests_total Total number of routed requests');
    lines.push('# TYPE app_requests_total counter');
    lines.push(`app_requests_total ${requestMetrics.total}`);

    lines.push('# HELP app_requests_errors_total Total number of failed requests');
    lines.push('# TYPE app_requests_errors_total counter');
    lines.push(`app_requests_errors_total ${requestMetrics.errors}`);

    lines.push('# HELP app_cost_usd_total Cumulative USD cost of routed requests');
    lines.push('# TYPE app_cost_usd_total counter');
    lines.push(`app_cost_usd_total ${requestMetrics.costUsd}`);
  }

  const body = lines.join('\n') + '\n';

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

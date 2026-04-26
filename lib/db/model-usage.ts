/**
 * 模型使用数据工具函数
 * 用于记录和查询用户真实使用行为
 */

import postgres from 'postgres';

// 连接池实例（单例模式）
let sql: ReturnType<typeof postgres> | null = null;

async function getPostgres() {
  if (sql) return sql;
  
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('[model-usage] POSTGRES_URL not configured');
    return null;
  }

  try {
    sql = postgres(connectionString, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 30,
      prepare: false, // Supabase transaction mode
    });
    await sql`SELECT 1 as test`;
    return sql;
  } catch (err) {
    console.error('[model-usage] PostgreSQL connection failed:', err);
    sql = null;
    return null;
  }
}

// 表已确保标志
let tablesEnsured = false;

/**
 * 确保表存在
 */
export async function ensureModelUsageTables() {
  if (tablesEnsured) return;
  
  const db = await getPostgres();
  if (!db) return;

  try {
    // 模型使用记录表（每次调用记录一条）
    await db`
      CREATE TABLE IF NOT EXISTS model_usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        task_type TEXT NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT true,
        created_at BIGINT NOT NULL
      )
    `;

    // 分类汇总表（定期聚合）
    await db`
      CREATE TABLE IF NOT EXISTS category_leaderboard (
        id TEXT PRIMARY KEY,
        task_type TEXT NOT NULL,
        model_id TEXT NOT NULL,
        selection_count INTEGER DEFAULT 0,
        total_input_tokens BIGINT DEFAULT 0,
        total_output_tokens BIGINT DEFAULT 0,
        total_tokens BIGINT DEFAULT 0,
        total_cost REAL DEFAULT 0,
        unique_users INTEGER DEFAULT 0,
        avg_latency REAL DEFAULT 0,
        success_rate REAL DEFAULT 1.0,
        period TEXT NOT NULL DEFAULT 'all',
        updated_at BIGINT NOT NULL,
        UNIQUE(task_type, model_id, period)
      )
    `;

    // 创建索引
    try {
      await db`CREATE INDEX IF NOT EXISTS idx_model_usage_logs_user_id ON model_usage_logs(user_id)`;
      await db`CREATE INDEX IF NOT EXISTS idx_model_usage_logs_model_id ON model_usage_logs(model_id)`;
      await db`CREATE INDEX IF NOT EXISTS idx_model_usage_logs_task_type ON model_usage_logs(task_type)`;
      await db`CREATE INDEX IF NOT EXISTS idx_model_usage_logs_created_at ON model_usage_logs(created_at)`;
      await db`CREATE INDEX IF NOT EXISTS idx_category_leaderboard_task_type ON category_leaderboard(task_type)`;
    } catch {
      // 索引可能已存在
    }

    tablesEnsured = true;
    console.log('[model-usage] Tables verified');
  } catch (err) {
    console.error('[model-usage] Failed to ensure tables:', err);
  }
}

/**
 * 记录模型使用
 */
export async function logModelUsage(params: {
  id: string;
  userId: string;
  modelId: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
}): Promise<boolean> {
  const db = await getPostgres();
  if (!db) return false;

  try {
    await ensureModelUsageTables();

    // 插入使用记录
    await db`
      INSERT INTO model_usage_logs (
        id, user_id, model_id, task_type, input_tokens, output_tokens,
        cost, latency_ms, success, created_at
      ) VALUES (
        ${params.id},
        ${params.userId},
        ${params.modelId},
        ${params.taskType},
        ${params.inputTokens},
        ${params.outputTokens},
        ${params.cost},
        ${params.latencyMs},
        ${params.success},
        ${Date.now()}
      )
    `;

    // 异步更新汇总表（不阻塞响应）
    updateCategoryLeaderboard(params).catch(err => {
      console.error('[model-usage] Failed to update leaderboard:', err);
    });

    return true;
  } catch (err) {
    console.error('[model-usage] Failed to log usage:', err);
    return false;
  }
}

/**
 * 更新分类排行榜汇总
 */
async function updateCategoryLeaderboard(params: {
  userId: string;
  modelId: string;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
}) {
  const db = await getPostgres();
  if (!db) return;

  const now = Date.now();
  const periods = ['all', '24h', '7d', '30d'];

  for (const period of periods) {
    // 检查时间范围
    let timeFilter = 0;
    if (period === '24h') timeFilter = now - 24 * 60 * 60 * 1000;
    else if (period === '7d') timeFilter = now - 7 * 24 * 60 * 60 * 1000;
    else if (period === '30d') timeFilter = now - 30 * 24 * 60 * 60 * 1000;

    // 查询聚合数据
    const whereClause = period === 'all' 
      ? db`WHERE task_type = ${params.taskType} AND model_id = ${params.modelId}`
      : db`WHERE task_type = ${params.taskType} AND model_id = ${params.modelId} AND created_at >= ${timeFilter}`;

    const stats = await db`
      SELECT 
        COUNT(*) as count,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        SUM(cost) as total_cost,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN success THEN 1 ELSE 0 END)::REAL / COUNT(*) as success_rate
      FROM model_usage_logs
      ${whereClause}
    `;

    if (stats.length === 0) continue;
    
    const stat = stats[0]!;
    const id = `${params.taskType}-${params.modelId}-${period}`;

    // Upsert 汇总表
    await db`
      INSERT INTO category_leaderboard (
        id, task_type, model_id, selection_count, total_input_tokens, total_output_tokens,
        total_tokens, total_cost, unique_users, avg_latency, success_rate, period, updated_at
      ) VALUES (
        ${id},
        ${params.taskType},
        ${params.modelId},
        ${stat.count as number},
        ${stat.total_input as number || 0},
        ${stat.total_output as number || 0},
        ${(stat.total_input as number || 0) + (stat.total_output as number || 0)},
        ${stat.total_cost as number || 0},
        ${stat.unique_users as number || 0},
        ${stat.avg_latency as number || 0},
        ${stat.success_rate as number || 1},
        ${period},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        selection_count = EXCLUDED.selection_count,
        total_input_tokens = EXCLUDED.total_input_tokens,
        total_output_tokens = EXCLUDED.total_output_tokens,
        total_tokens = EXCLUDED.total_tokens,
        total_cost = EXCLUDED.total_cost,
        unique_users = EXCLUDED.unique_users,
        avg_latency = EXCLUDED.avg_latency,
        success_rate = EXCLUDED.success_rate,
        updated_at = EXCLUDED.updated_at
    `;
  }
}

/**
 * 排行榜查询参数
 */
export interface LeaderboardQuery {
  category: string; // coding, reasoning, math, translation, creative, analysis, chinese, chat
  sort: 'selections' | 'tokens' | 'cost' | 'users';
  period: '24h' | '7d' | '30d' | 'all';
  limit?: number;
}

/**
 * 排行榜项
 */
export interface LeaderboardItem {
  modelId: string;
  name: string;
  provider: string;
  selectionCount: number;
  totalTokens: number;
  totalCost: number;
  uniqueUsers: number;
  avgLatency: number;
  successRate: number;
}

/**
 * 查询分类排行榜
 */
export async function getCategoryLeaderboard(query: LeaderboardQuery): Promise<LeaderboardItem[]> {
  const db = await getPostgres();
  if (!db) return [];

  try {
    await ensureModelUsageTables();

    const limit = query.limit || 20;
    
    // 排序字段映射
    const sortField = {
      selections: 'selection_count',
      tokens: 'total_tokens',
      cost: 'total_cost',
      users: 'unique_users',
    }[query.sort] || 'selection_count';

    const results = await db`
      SELECT 
        model_id,
        selection_count,
        total_tokens,
        total_cost,
        unique_users,
        avg_latency,
        success_rate
      FROM category_leaderboard
      WHERE task_type = ${query.category} AND period = ${query.period}
      ORDER BY ${db.unsafe(sortField)} DESC
      LIMIT ${limit}
    `;

    // 获取模型名称和 provider
    const { getModelCapability } = await import('@/lib/routing/providers');
    
    return results.map((row) => {
      const cap = getModelCapability(row.model_id as string);
      const modelId = row.model_id as string;
      return {
        modelId,
        name: cap?.model || modelId.split('/').pop() || modelId,
        provider: cap?.provider || modelId.split('/')[0] || 'unknown',
        selectionCount: row.selection_count as number,
        totalTokens: row.total_tokens as number,
        totalCost: row.total_cost as number,
        uniqueUsers: row.unique_users as number,
        avgLatency: row.avg_latency as number,
        successRate: row.success_rate as number,
      };
    });
  } catch (err) {
    console.error('[model-usage] Failed to get leaderboard:', err);
    return [];
  }
}

/**
 * 获取所有分类的排行概览
 */
export async function getAllCategoriesOverview(): Promise<Record<string, LeaderboardItem[]>> {
  const categories = ['coding', 'reasoning', 'math', 'translation', 'creative', 'analysis', 'chinese', 'chat'];
  const results: Record<string, LeaderboardItem[]> = {};

  for (const category of categories) {
    results[category] = await getCategoryLeaderboard({
      category,
      sort: 'selections',
      period: 'all',
      limit: 5,
    });
  }

  return results;
}

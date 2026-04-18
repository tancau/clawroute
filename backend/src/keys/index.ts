import { z } from 'zod';
import type { Tool, ToolContext, ToolResult } from '../tools/types';
import { db } from '../db';
import crypto from 'crypto';
import { encryptApiKey, decryptApiKey, generateKeyPreview, validateKeyFormat } from '../utils/crypto';

/**
 * 共享 Key Schema
 */
export const SharedKeySchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.string(),
  keyPreview: z.string(),
  tier: z.enum(['free', 'paid', 'enterprise']),
  isActive: z.boolean(),
  totalCalls: z.number().int().nonnegative(),
  lastUsedAt: z.number().nullable(),
  createdAt: z.number(),
  expiresAt: z.number().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export type SharedKey = z.infer<typeof SharedKeySchema>;

/**
 * 提交 Key 输入
 */
export const SubmitKeyInput = z.object({
  userId: z.string(),
  provider: z.string(),
  apiKey: z.string().min(10),
  tier: z.enum(['free', 'paid', 'enterprise']).default('free'),
  expiresAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * 查询 Key 输入
 */
export const GetKeysInput = z.object({
  userId: z.string(),
  provider: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Key 状态更新输入
 */
export const UpdateKeyInput = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * API Key 管理工具
 */
export const KeyTool: Tool<typeof SubmitKeyInput, SharedKey> = {
  name: 'key',
  description: 'API Key management: submit, query, update shared keys',
  inputSchema: SubmitKeyInput,
  outputSchema: SharedKeySchema,

  isEnabled() {
    return true;
  },

  isConcurrencySafe() {
    return true;
  },

  isReadOnly() {
    return false;
  },

  isDestructive() {
    return false;
  },

  async call(input: z.infer<typeof SubmitKeyInput>, context: ToolContext): Promise<ToolResult<SharedKey>> {
    // 验证 Key 格式
    if (!validateKeyFormat(input.apiKey, input.provider)) {
      throw new Error(`Invalid API key format for provider: ${input.provider}`);
    }

    const now = Date.now();
    const id = crypto.randomUUID();
    const keyEncrypted = encryptApiKey(input.apiKey);
    const keyPreview = generateKeyPreview(input.apiKey);

    const stmt = db.prepare(`
      INSERT INTO shared_keys (id, user_id, provider, key_encrypted, key_preview, tier, is_active, created_at, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.userId,
      input.provider,
      keyEncrypted,
      keyPreview,
      input.tier,
      now,
      input.expiresAt || null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    const key: SharedKey = {
      id,
      userId: input.userId,
      provider: input.provider,
      keyPreview,
      tier: input.tier,
      isActive: true,
      totalCalls: 0,
      lastUsedAt: null,
      createdAt: now,
      expiresAt: input.expiresAt || null,
      metadata: input.metadata,
    };

    return {
      data: key,
      metadata: { requestId: context.requestId },
    };
  },
};

/**
 * 查询用户的 Keys
 */
export function getKeys(input: z.infer<typeof GetKeysInput>): SharedKey[] {
  let sql = 'SELECT * FROM shared_keys WHERE user_id = ?';
  const params: any[] = [input.userId];

  if (input.provider) {
    sql += ' AND provider = ?';
    params.push(input.provider);
  }

  if (input.isActive !== undefined) {
    sql += ' AND is_active = ?';
    params.push(input.isActive ? 1 : 0);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    keyPreview: row.key_preview,
    tier: row.tier,
    isActive: row.is_active === 1,
    totalCalls: row.total_calls,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  }));
}

/**
 * 获取可用的 Key（用于分配）
 */
export function getAvailableKey(provider: string, tier?: string): { key: string; keyId: string } | null {
  let sql = `
    SELECT id, key_encrypted 
    FROM shared_keys 
    WHERE provider = ? AND is_active = 1 
    AND (expires_at IS NULL OR expires_at > ?)
  `;
  const params: any[] = [provider, Date.now()];

  if (tier) {
    sql += ' AND tier = ?';
    params.push(tier);
  }

  // 按使用次数排序，优先使用调用少的 Key（负载均衡）
  sql += ' ORDER BY total_calls ASC LIMIT 1';

  const stmt = db.prepare(sql);
  const row = stmt.get(...params) as any;

  if (!row) return null;

  return {
    key: decryptApiKey(row.key_encrypted),
    keyId: row.id,
  };
}

/**
 * 更新 Key 状态
 */
export function updateKey(input: z.infer<typeof UpdateKeyInput>): SharedKey | null {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(input.isActive ? 1 : 0);
  }

  if (input.metadata !== undefined) {
    updates.push('metadata = ?');
    values.push(JSON.stringify(input.metadata));
  }

  if (updates.length === 0) return getKeyById(input.id);

  values.push(input.id);
  const stmt = db.prepare(`UPDATE shared_keys SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getKeyById(input.id);
}

/**
 * 记录 Key 使用
 */
export function recordKeyUsage(keyId: string): void {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE shared_keys 
    SET total_calls = total_calls + 1, last_used_at = ? 
    WHERE id = ?
  `);
  stmt.run(now, keyId);
}

/**
 * 根据 ID 获取 Key
 */
function getKeyById(id: string): SharedKey | null {
  const stmt = db.prepare('SELECT * FROM shared_keys WHERE id = ?');
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    keyPreview: row.key_preview,
    tier: row.tier,
    isActive: row.is_active === 1,
    totalCalls: row.total_calls,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

/**
 * 删除 Key
 */
export function deleteKey(id: string): boolean {
  const stmt = db.prepare('DELETE FROM shared_keys WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

import { z } from 'zod';
import type { Tool, ToolContext, ToolResult } from '../tools/types';
import { db } from '../db';
import crypto from 'crypto';

/**
 * 用户 Schema
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  tier: z.enum(['free', 'pro', 'enterprise']),
  credits: z.number().int().nonnegative(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * 用户创建输入
 */
export const CreateUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  tier: z.enum(['free', 'pro', 'enterprise']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * 用户查询输入
 */
export const GetUserInput = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * 用户更新输入
 */
export const UpdateUserInput = z.object({
  id: z.string(),
  tier: z.enum(['free', 'pro', 'enterprise']).optional(),
  credits: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * 密码哈希
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  const salt = parts[0] ?? '';
  const hash = parts[1] ?? '';
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
}

/**
 * 用户管理工具
 */
export const UserTool: Tool<typeof CreateUserInput, User> = {
  name: 'user',
  description: 'User management: create, get, update users',
  inputSchema: CreateUserInput,
  outputSchema: UserSchema,

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

  async call(input: z.infer<typeof CreateUserInput>, context: ToolContext): Promise<ToolResult<User>> {
    const now = Date.now();
    const id = crypto.randomUUID();
    const passwordHash = hashPassword(input.password);

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, tier, credits, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.email,
      passwordHash,
      input.tier || 'free',
      100, // 新用户 100 次免费调用
      now,
      now,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

    const user: User = {
      id,
      email: input.email,
      passwordHash,
      tier: input.tier || 'free',
      credits: 100,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    return {
      data: user,
      metadata: { requestId: context.requestId },
    };
  },
};

/**
 * 查询用户
 */
export function getUser(input: z.infer<typeof GetUserInput>): User | null {
  if (!input.id && !input.email) {
    return null;
  }

  const stmt = input.id
    ? db.prepare('SELECT * FROM users WHERE id = ?')
    : db.prepare('SELECT * FROM users WHERE email = ?');

  const row = stmt.get(input.id || input.email) as any;
  
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    tier: row.tier,
    credits: row.credits,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

/**
 * 更新用户
 */
export function updateUser(input: z.infer<typeof UpdateUserInput>): User | null {
  const user = getUser({ id: input.id });
  if (!user) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (input.tier !== undefined) {
    updates.push('tier = ?');
    values.push(input.tier);
  }

  if (input.credits !== undefined) {
    updates.push('credits = ?');
    values.push(input.credits);
  }

  if (input.metadata !== undefined) {
    updates.push('metadata = ?');
    values.push(JSON.stringify({ ...user.metadata, ...input.metadata }));
  }

  if (updates.length === 0) return user;

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(input.id);

  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getUser({ id: input.id });
}

/**
 * 扣减积分
 */
export function deductCredits(userId: string, amount: number): boolean {
  const stmt = db.prepare('UPDATE users SET credits = credits - ?, updated_at = ? WHERE id = ? AND credits >= ?');
  const result = stmt.run(amount, Date.now(), userId, amount);
  return result.changes > 0;
}

/**
 * 增加积分
 */
export function addCredits(userId: string, amount: number): boolean {
  const stmt = db.prepare('UPDATE users SET credits = credits + ?, updated_at = ? WHERE id = ?');
  const result = stmt.run(amount, Date.now(), userId);
  return result.changes > 0;
}

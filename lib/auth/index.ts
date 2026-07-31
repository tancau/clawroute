import crypto from 'crypto';

// ===== Password Utilities =====

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  const salt = parts[0] ?? '';
  const hash = parts[1] ?? '';
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
}

// ===== JWT Utilities =====

function signJWT(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * 获取 JWT 密钥（集中管理，所有代码应使用此函数）
 */
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function verifyJWT(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  // 常量时间比较，避免时序攻击（先校验长度，timingSafeEqual 要求等长 Buffer）
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ===== User Types =====

export interface SafeUser {
  id: string;
  email: string;
  name?: string;
  tier: string;
  credits: number;
  apiKey?: string;
  createdAt: number;
  providerKeys?: Record<string, unknown>; // 用户配置的 Provider API Keys（动态类型）
}

interface InternalUser extends SafeUser {
  passwordHash: string;
  providerKeysEncrypted?: string; // 加密存储的 Provider Keys
}

// ===== Token Generation =====

export function generateTokens(userId: string, tier: string) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJWT(
    { userId, tier, iat: now, exp: now + 3600 },
    getJWTSecret()
  );
  const refreshToken = signJWT(
    { userId, type: 'refresh', iat: now, exp: now + 7 * 86400 },
    getJWTSecret()
  );
  return { accessToken, refreshToken, expiresIn: 3600 };
}

// ===== Storage Layer =====
// Uses Vercel Postgres when available, falls back to in-memory store

// 连接状态追踪（带时间戳，允许自动重试）
let lastConnectionAttempt = 0;
let connectionError: string | null = null;
const CONNECTION_RETRY_INTERVAL = 30000; // 30秒后自动重试

async function getPostgres() {
  const now = Date.now();
  
  // 如果最近失败过，检查是否应该重试
  if (connectionError && now - lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
    // PostgreSQL 不可用时静默使用内存回退
    return null;
  }
  
  try {
    // Try different connection methods
    const { sql } = await import('@vercel/postgres');
    
    // Test connection with timeout
    const result = await sql`SELECT 1 as test`;
    connectionError = null; // 重置错误状态
    return sql;
  } catch (err) {
    lastConnectionAttempt = now;
    connectionError = err instanceof Error ? err.message : String(err);
    // PostgreSQL 不可用时静默使用内存回退，不输出敏感错误信息
    return null;
  }
}

// In-memory fallback store
const memoryUsers: Map<string, InternalUser> = new Map();
const memoryUsersById: Map<string, InternalUser> = new Map();

// 内存存储定期清理（防止无限增长）
const MEMORY_STORE_MAX_SIZE = 10000;
setInterval(() => {
  if (memoryUsers.size > MEMORY_STORE_MAX_SIZE) {
    // 按创建时间排序，移除最旧的一半
    const entries = Array.from(memoryUsers.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    for (const [key] of toRemove) {
      memoryUsers.delete(key);
    }
  }
}, 3600000); // 每小时检查一次

// 确保 Postgres 表存在（只执行一次）
let tableEnsured = false;

async function ensureTable() {
  if (tableEnsured) return;
  const sql = await getPostgres();
  if (!sql) return;
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        tier TEXT NOT NULL DEFAULT 'free',
        credits INTEGER NOT NULL DEFAULT 100,
        status TEXT NOT NULL DEFAULT 'active',
        api_key TEXT UNIQUE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        metadata TEXT,
        provider_keys TEXT
      )
    `;
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    } catch {
      // Index may already exist
    }
    tableEnsured = true;
  } catch {
    // 静默处理表创建错误
  }
}

// ===== User Operations =====

export async function findUserById(id: string): Promise<InternalUser | null> {
  const sql = await getPostgres();

  if (sql) {
    await ensureTable();
    const result = await sql`
      SELECT id, email, password_hash, name, tier, credits, api_key, created_at, provider_keys
      FROM users WHERE id = ${id}
    `;
    if (result.rows.length === 0) return null;
    const row = result.rows[0]!;
    return {
      id: row.id as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      name: (row.name as string) || undefined,
      tier: row.tier as string,
      credits: row.credits as number,
      apiKey: (row.api_key as string) || undefined,
      createdAt: row.created_at as number,
      providerKeysEncrypted: (row.provider_keys as string) || undefined,
    };
  }

  // Fallback: memory store
  const user = memoryUsersById.get(id);
  return user || null;
}

export async function findUserByEmail(email: string): Promise<InternalUser | null> {
  const sql = await getPostgres();
  const normalizedEmail = email.toLowerCase().trim();

  if (sql) {
    await ensureTable();
    const result = await sql`
      SELECT id, email, password_hash, name, tier, credits, api_key, created_at, provider_keys
      FROM users WHERE email = ${normalizedEmail}
    `;
    if (result.rows.length === 0) return null;
    const row = result.rows[0]!;
    return {
      id: row.id as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      name: (row.name as string) || undefined,
      tier: row.tier as string,
      credits: row.credits as number,
      apiKey: (row.api_key as string) || undefined,
      createdAt: row.created_at as number,
      providerKeysEncrypted: (row.provider_keys as string) || undefined,
    };
  }

  // Fallback: memory store
  return memoryUsers.get(normalizedEmail) || null;
}

export async function createUser(email: string, password: string, name?: string): Promise<SafeUser> {
  const id = crypto.randomUUID();
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = hashPassword(password);
  const apiKey = `hl-${crypto.randomBytes(24).toString('hex')}`;
  const now = Date.now();
  
  // 获取动态配置的默认 credits
  let defaultCredits = 100;
  try {
    const { getConfig } = await import('../config');
    defaultCredits = await getConfig<number>('system.default_credits', 100);
  } catch {
    // 配置系统不可用时使用默认值
  }

  const sql = await getPostgres();

  if (sql) {
    await ensureTable();
    await sql`
      INSERT INTO users (id, email, password_hash, name, tier, credits, api_key, created_at, updated_at)
      VALUES (${id}, ${normalizedEmail}, ${passwordHash}, ${name || null}, 'free', ${defaultCredits}, ${apiKey}, ${now}, ${now})
    `;
  } else {
    // Fallback: memory store - 用户数据将在服务器重启后丢失
    const user: InternalUser = {
      id, email: normalizedEmail, passwordHash, name, tier: 'free', credits: defaultCredits, apiKey, createdAt: now,
    };
    memoryUsers.set(normalizedEmail, user);
    memoryUsersById.set(id, user);
  }

  return { id, email: normalizedEmail, name, tier: 'free', credits: defaultCredits, apiKey, createdAt: now };
}

export function isUsingPostgres(): boolean {
  return connectionError === null;
}

// ===== Provider Keys Operations =====

/**
 * 通过 API Key 查找用户
 */
export async function findUserByApiKey(apiKey: string): Promise<InternalUser | null> {
  const sql = await getPostgres();

  if (sql) {
    await ensureTable();
    const result = await sql`
      SELECT id, email, password_hash, name, tier, credits, api_key, created_at, provider_keys
      FROM users WHERE api_key = ${apiKey} AND status = 'active'
    `;
    if (result.rows.length === 0) return null;
    const row = result.rows[0]!;
    return {
      id: row.id as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      name: (row.name as string) || undefined,
      tier: row.tier as string,
      credits: row.credits as number,
      apiKey: (row.api_key as string) || undefined,
      createdAt: row.created_at as number,
      providerKeysEncrypted: (row.provider_keys as string) || undefined,
    };
  }

  // Fallback: memory store
  for (const user of Array.from(memoryUsers.values())) {
    if (user.apiKey === apiKey) {
      return user;
    }
  }
  return null;
}

/**
 * 更新用户的 Provider Keys
 */
export async function updateUserProviderKeys(
  userId: string,
  providerKeys: Record<string, unknown>
): Promise<boolean> {
  const { encryptProviderKeys, toProviderKeys } = await import('../encryption');
  const strictKeys = toProviderKeys(providerKeys);
  const encrypted = Object.keys(strictKeys).length > 0
    ? encryptProviderKeys(strictKeys)
    : null;

  const sql = await getPostgres();

  if (sql) {
    await ensureTable();
    await sql`
      UPDATE users 
      SET provider_keys = ${encrypted}, updated_at = ${Date.now()}
      WHERE id = ${userId}
    `;
    return true;
  }

  // Fallback: memory store
  for (const user of Array.from(memoryUsers.values())) {
    if (user.id === userId) {
      user.providerKeysEncrypted = encrypted || undefined;
      user.providerKeys = providerKeys;
      return true;
    }
  }
  return false;
}

/**
 * 获取用户的 Provider Keys（解密后）
 */
export async function getUserProviderKeys(userId: string): Promise<Record<string, unknown>> {
  const sql = await getPostgres();

  if (sql) {
    await ensureTable();
    const result = await sql`
      SELECT provider_keys FROM users WHERE id = ${userId}
    `;
    if (result.rows.length === 0) return {};
    
    const encrypted = result.rows[0]?.provider_keys as string | null;
    if (!encrypted) return {};
    
    try {
      const { decryptProviderKeys } = await import('../encryption');
      return decryptProviderKeys(encrypted);
    } catch {
      return {};
    }
  }

  // Fallback: memory store
  for (const user of Array.from(memoryUsers.values())) {
    if (user.id === userId && user.providerKeysEncrypted) {
      try {
        const { decryptProviderKeys } = await import('../encryption');
        return decryptProviderKeys(user.providerKeysEncrypted);
      } catch {
        return {};
      }
    }
  }
  return {};
}

// ===== Credits Operations =====

/**
 * 扣减用户 Credits
 * @returns true 如果扣减成功，false 如果余额不足
 */
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const sql = await getPostgres();
  
  if (sql) {
    await ensureTable();
    const result = await sql`
      UPDATE users 
      SET credits = credits - ${amount}, updated_at = ${Date.now()}
      WHERE id = ${userId} AND credits >= ${amount}
    `;
    return (result.rowCount ?? 0) > 0;
  }

  // Fallback: memory store
  const user = memoryUsers.get(userId);
  if (user && user.credits >= amount) {
    user.credits -= amount;
    return true;
  }
  return false;
}

/**
 * 获取用户当前 Credits
 */
export async function getCredits(userId: string): Promise<number> {
  const sql = await getPostgres();
  
  if (sql) {
    await ensureTable();
    const result = await sql`
      SELECT credits FROM users WHERE id = ${userId}
    `;
    return (result.rows[0]?.credits as number) ?? 0;
  }

  // Fallback: memory store
  const user = memoryUsers.get(userId);
  return user?.credits ?? 0;
}

/**
 * 增加 Credits（用于充值或升级赠送）
 */
export async function addCredits(userId: string, amount: number): Promise<boolean> {
  const sql = await getPostgres();
  
  if (sql) {
    await ensureTable();
    await sql`
      UPDATE users 
      SET credits = credits + ${amount}, updated_at = ${Date.now()}
      WHERE id = ${userId}
    `;
    return true;
  }

  // Fallback: memory store
  const user = memoryUsers.get(userId);
  if (user) {
    user.credits += amount;
    return true;
  }
  return false;
}
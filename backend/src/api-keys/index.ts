import { db } from '../db';
import crypto from 'crypto';

/**
 * Developer API Key interface
 */
export interface DeveloperApiKey {
  id: string;
  userId: string;
  teamId?: string;
  name: string;
  key: string; // hashed
  prefix: string; // visible prefix e.g. "cr_abc...xyz"
  permissions: string[];
  rateLimit: number;
  usageLimit: number;
  lastUsedAt: number;
  expiresAt?: number;
  createdAt: number;
  isActive: boolean;
}

/**
 * Create API Key options
 */
export interface CreateApiKeyOptions {
  userId: string;
  teamId?: string;
  name: string;
  permissions?: string[];
  rateLimit?: number;
  usageLimit?: number;
  expiresAt?: number;
}

/**
 * Initialize API keys database table
 */
export function initApiKeysTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS developer_api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',
      rate_limit INTEGER NOT NULL DEFAULT 60,
      usage_limit INTEGER NOT NULL DEFAULT 10000,
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_user ON developer_api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_team ON developer_api_keys(team_id);
    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_prefix ON developer_api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_dev_api_keys_active ON developer_api_keys(is_active);
  `);
}

/**
 * Hash a raw API key for storage
 */
function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Generate a new raw API key with prefix
 */
function generateRawKey(): { rawKey: string; prefix: string } {
  const bytes = crypto.randomBytes(32);
  const key = bytes.toString('base64url');
  const prefix = `cr_${key.slice(0, 8)}...${key.slice(-4)}`;
  return { rawKey: `cr_${key}`, prefix };
}

/**
 * Create a new developer API key
 * Returns the full key only once; store it securely on the client.
 */
export function createApiKey(options: CreateApiKeyOptions): { apiKey: DeveloperApiKey; rawKey: string } {
  const { rawKey, prefix } = generateRawKey();
  const keyHash = hashKey(rawKey);
  const id = crypto.randomUUID();
  const now = Date.now();

  const permissions = options.permissions ?? ['chat:completion', 'models:list'];
  const rateLimit = options.rateLimit ?? 60;
  const usageLimit = options.usageLimit ?? 10000;

  db.prepare(`
    INSERT INTO developer_api_keys (id, user_id, team_id, name, key_hash, key_prefix, permissions, rate_limit, usage_limit, usage_count, last_used_at, expires_at, created_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    options.userId,
    options.teamId ?? null,
    options.name,
    keyHash,
    prefix,
    JSON.stringify(permissions),
    rateLimit,
    usageLimit,
    0,
    0,
    options.expiresAt ?? null,
    now,
    1
  );

  const apiKey: DeveloperApiKey = {
    id,
    userId: options.userId,
    teamId: options.teamId,
    name: options.name,
    key: keyHash,
    prefix,
    permissions,
    rateLimit,
    usageLimit,
    lastUsedAt: 0,
    expiresAt: options.expiresAt,
    createdAt: now,
    isActive: true,
  };

  return { apiKey, rawKey };
}

/**
 * List all API keys for a user
 */
export function listApiKeys(userId: string): DeveloperApiKey[] {
  const rows = db.prepare('SELECT * FROM developer_api_keys WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  return rows.map(mapRow);
}

/**
 * List API keys for a team
 */
export function listTeamApiKeys(teamId: string): DeveloperApiKey[] {
  const rows = db.prepare('SELECT * FROM developer_api_keys WHERE team_id = ? ORDER BY created_at DESC').all(teamId) as any[];
  return rows.map(mapRow);
}

/**
 * Get a single API key by ID
 */
export function getApiKey(keyId: string): DeveloperApiKey | null {
  const row = db.prepare('SELECT * FROM developer_api_keys WHERE id = ?').get(keyId) as any;
  return row ? mapRow(row) : null;
}

/**
 * Validate a raw API key and return the key record if valid
 */
export function validateApiKey(rawKey: string): DeveloperApiKey | null {
  const keyHash = hashKey(rawKey);

  const row = db.prepare('SELECT * FROM developer_api_keys WHERE key_hash = ? AND is_active = 1').get(keyHash) as any;
  if (!row) return null;

  // Check expiration
  if (row.expires_at && row.expires_at < Date.now()) {
    // Auto-deactivate expired key
    db.prepare('UPDATE developer_api_keys SET is_active = 0 WHERE id = ?').run(row.id);
    return null;
  }

  // Check usage limit
  if (row.usage_count >= row.usage_limit) {
    return null;
  }

  // Update last used and usage count
  db.prepare('UPDATE developer_api_keys SET last_used_at = ?, usage_count = usage_count + 1 WHERE id = ?').run(Date.now(), row.id);

  return mapRow(row);
}

/**
 * Revoke (deactivate) an API key
 */
export function revokeApiKey(keyId: string): boolean {
  const result = db.prepare('UPDATE developer_api_keys SET is_active = 0 WHERE id = ?').run(keyId);
  return result.changes > 0;
}

/**
 * Update an API key's settings
 */
export function updateApiKey(keyId: string, updates: {
  name?: string;
  permissions?: string[];
  rateLimit?: number;
  usageLimit?: number;
  expiresAt?: number;
}): DeveloperApiKey | null {
  const key = getApiKey(keyId);
  if (!key) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.permissions !== undefined) {
    setClauses.push('permissions = ?');
    values.push(JSON.stringify(updates.permissions));
  }
  if (updates.rateLimit !== undefined) {
    setClauses.push('rate_limit = ?');
    values.push(updates.rateLimit);
  }
  if (updates.usageLimit !== undefined) {
    setClauses.push('usage_limit = ?');
    values.push(updates.usageLimit);
  }
  if (updates.expiresAt !== undefined) {
    setClauses.push('expires_at = ?');
    values.push(updates.expiresAt);
  }

  if (setClauses.length === 0) return key;

  values.push(keyId);
  db.prepare(`UPDATE developer_api_keys SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

  return getApiKey(keyId);
}

/**
 * Delete an API key permanently
 */
export function deleteApiKey(keyId: string): boolean {
  const result = db.prepare('DELETE FROM developer_api_keys WHERE id = ?').run(keyId);
  return result.changes > 0;
}

/**
 * Get API key usage stats
 */
export function getApiKeyUsage(keyId: string): { usageCount: number; usageLimit: number; percentUsed: number; lastUsedAt: number } | null {
  const row = db.prepare('SELECT usage_count, usage_limit, last_used_at FROM developer_api_keys WHERE id = ?').get(keyId) as any;
  if (!row) return null;

  return {
    usageCount: row.usage_count,
    usageLimit: row.usage_limit,
    percentUsed: row.usage_limit > 0 ? Math.round((row.usage_count / row.usage_limit) * 100) : 0,
    lastUsedAt: row.last_used_at,
  };
}

/**
 * Map a database row to a DeveloperApiKey
 */
function mapRow(row: any): DeveloperApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id ?? undefined,
    name: row.name,
    key: row.key_hash,
    prefix: row.key_prefix,
    permissions: JSON.parse(row.permissions ?? '[]'),
    rateLimit: row.rate_limit,
    usageLimit: row.usage_limit,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
    isActive: row.is_active === 1,
  };
}

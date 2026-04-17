/**
 * Admin SSO Management Module
 * SSO 管理后台 API
 */

import { db } from '../db';

export interface SSOProviderView {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  connectionCount: number;
  createdAt: number;
}

export interface SSOConnectionView {
  id: string;
  teamId: string;
  teamName?: string;
  providerId: string;
  providerName?: string;
  domain: string;
  status: 'pending' | 'active' | 'disabled' | 'rejected';
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SSOProviderListOptions {
  type?: string;
  enabled?: boolean;
  offset?: number;
  limit?: number;
}

export interface SSOConnectionListOptions {
  teamId?: string;
  providerId?: string;
  status?: string;
  domain?: string;
  offset?: number;
  limit?: number;
}

// 初始化 SSO 管理表
export function initSSOAdminTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sso_provider_status (
      provider_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES sso_providers(id)
    );
  `);
}

// SSO Provider 列表
export function listSSOProviders(options: SSOProviderListOptions = {}): { providers: SSOProviderView[]; total: number } {
  const {
    type,
    enabled,
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (type) {
    whereClauses.push('sp.type = ?');
    params.push(type);
  }

  if (enabled !== undefined) {
    whereClauses.push('COALESCE(sps.enabled, 1) = ?');
    params.push(enabled ? 1 : 0);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM sso_providers sp LEFT JOIN sso_provider_status sps ON sp.id = sps.provider_id ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  const query = `
    SELECT 
      sp.id,
      sp.name,
      sp.type,
      COALESCE(sps.enabled, 1) as enabled,
      COALESCE(conn_count.cnt, 0) as connection_count,
      sp.created_at
    FROM sso_providers sp
    LEFT JOIN sso_provider_status sps ON sp.id = sps.provider_id
    LEFT JOIN (SELECT provider_id, COUNT(*) as cnt FROM sso_connections GROUP BY provider_id) conn_count ON sp.id = conn_count.provider_id
    ${whereClause}
    ORDER BY sp.name ASC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const providers: SSOProviderView[] = rows.map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    enabled: row.enabled === 1,
    connectionCount: row.connection_count,
    createdAt: row.created_at,
  }));

  return { providers, total };
}

// SSO Provider 详情
export function getSSOProviderDetail(providerId: string): SSOProviderView | null {
  const row = db.prepare(`
    SELECT 
      sp.id,
      sp.name,
      sp.type,
      COALESCE(sps.enabled, 1) as enabled,
      COALESCE(conn_count.cnt, 0) as connection_count,
      sp.created_at
    FROM sso_providers sp
    LEFT JOIN sso_provider_status sps ON sp.id = sps.provider_id
    LEFT JOIN (SELECT provider_id, COUNT(*) as cnt FROM sso_connections WHERE provider_id = ?) conn_count ON sp.id = conn_count.provider_id
    WHERE sp.id = ?
  `).get(providerId, providerId) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    enabled: row.enabled === 1,
    connectionCount: row.connection_count,
    createdAt: row.created_at,
  };
}

// 启用 SSO Provider
export function enableSSOProvider(providerId: string): void {
  const existing = db.prepare('SELECT provider_id FROM sso_provider_status WHERE provider_id = ?').get(providerId) as any;
  if (existing) {
    db.prepare('UPDATE sso_provider_status SET enabled = 1, updated_at = ? WHERE provider_id = ?').run(Date.now(), providerId);
  } else {
    db.prepare('INSERT INTO sso_provider_status (provider_id, enabled, updated_at) VALUES (?, 1, ?)').run(providerId, Date.now());
  }
}

// 禁用 SSO Provider
export function disableSSOProvider(providerId: string): void {
  const existing = db.prepare('SELECT provider_id FROM sso_provider_status WHERE provider_id = ?').get(providerId) as any;
  if (existing) {
    db.prepare('UPDATE sso_provider_status SET enabled = 0, updated_at = ? WHERE provider_id = ?').run(Date.now(), providerId);
  } else {
    db.prepare('INSERT INTO sso_provider_status (provider_id, enabled, updated_at) VALUES (?, 0, ?)').run(providerId, Date.now());
  }
}

// SSO 连接列表
export function listSSOConnections(options: SSOConnectionListOptions = {}): { connections: SSOConnectionView[]; total: number } {
  const {
    teamId,
    providerId,
    status,
    domain,
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (teamId) {
    whereClauses.push('sc.team_id = ?');
    params.push(teamId);
  }

  if (providerId) {
    whereClauses.push('sc.provider_id = ?');
    params.push(providerId);
  }

  if (status) {
    whereClauses.push('sc.status = ?');
    params.push(status);
  }

  if (domain) {
    whereClauses.push('sc.domain LIKE ?');
    params.push(`%${domain}%`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM sso_connections sc ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  const query = `
    SELECT 
      sc.id,
      sc.team_id,
      t.name as team_name,
      sc.provider_id,
      sp.name as provider_name,
      sc.domain,
      sc.status,
      sc.config,
      sc.created_at,
      sc.updated_at
    FROM sso_connections sc
    LEFT JOIN teams t ON sc.team_id = t.id
    LEFT JOIN sso_providers sp ON sc.provider_id = sp.id
    ${whereClause}
    ORDER BY sc.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const connections: SSOConnectionView[] = rows.map(row => ({
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    providerId: row.provider_id,
    providerName: row.provider_name || undefined,
    domain: row.domain,
    status: row.status,
    config: row.config ? JSON.parse(row.config) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { connections, total };
}

// SSO 连接详情
export function getSSOConnectionDetail(connectionId: string): SSOConnectionView | null {
  const row = db.prepare(`
    SELECT 
      sc.id,
      sc.team_id,
      t.name as team_name,
      sc.provider_id,
      sp.name as provider_name,
      sc.domain,
      sc.status,
      sc.config,
      sc.created_at,
      sc.updated_at
    FROM sso_connections sc
    LEFT JOIN teams t ON sc.team_id = t.id
    LEFT JOIN sso_providers sp ON sc.provider_id = sp.id
    WHERE sc.id = ?
  `).get(connectionId) as any;

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    providerId: row.provider_id,
    providerName: row.provider_name || undefined,
    domain: row.domain,
    status: row.status,
    config: row.config ? JSON.parse(row.config) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 审批通过 SSO 连接
export function approveSSOConnection(connectionId: string): void {
  db.prepare("UPDATE sso_connections SET status = 'active', updated_at = ? WHERE id = ?").run(Date.now(), connectionId);

  // 记录审计日志
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'sso_connection.approved',
    JSON.stringify({ connectionId }),
    Date.now()
  );
}

// 拒绝 SSO 连接
export function rejectSSOConnection(connectionId: string, reason?: string): void {
  db.prepare("UPDATE sso_connections SET status = 'rejected', updated_at = ? WHERE id = ?").run(Date.now(), connectionId);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'sso_connection.rejected',
    JSON.stringify({ connectionId, reason: reason || 'Admin rejected' }),
    Date.now()
  );
}

// 测试 SSO 连接
export function testSSOConnection(connectionId: string): { success: boolean; message: string; latencyMs?: number } {
  const conn = db.prepare('SELECT * FROM sso_connections WHERE id = ?').get(connectionId) as any;
  if (!conn) {
    return { success: false, message: 'Connection not found' };
  }

  if (conn.status !== 'active') {
    return { success: false, message: `Connection is ${conn.status}, cannot test` };
  }

  // Simulate SSO connection test
  const start = Date.now();
  try {
    // In production, this would attempt to connect to the IdP
    const provider = db.prepare('SELECT * FROM sso_providers WHERE id = ?').get(conn.provider_id) as any;
    if (!provider) {
      return { success: false, message: 'Provider not found' };
    }

    const providerEnabled = db.prepare('SELECT enabled FROM sso_provider_status WHERE provider_id = ?').get(conn.provider_id) as any;
    if (providerEnabled && !providerEnabled.enabled) {
      return { success: false, message: 'Provider is disabled' };
    }

    const latencyMs = Date.now() - start;
    return { success: true, message: 'SSO connection test passed', latencyMs };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Test failed' };
  }
}

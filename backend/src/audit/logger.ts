import { db } from '../db';
import crypto from 'crypto';

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  userId: string;
  teamId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ip: string;
  userAgent: string;
  timestamp: number;
}

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

/**
 * Audit event to log
 */
export interface AuditEvent {
  userId: string;
  teamId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

/**
 * Initialize audit log database tables
 */
export function initAuditTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip TEXT,
      user_agent TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_team ON audit_logs(team_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource);
  `);
}

/**
 * Log an audit event
 */
export function logAudit(event: AuditEvent): AuditLog {
  const id = crypto.randomUUID();
  const timestamp = Date.now();

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, team_id, action, resource, resource_id, details, ip, user_agent, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.userId,
    event.teamId ?? null,
    event.action,
    event.resource,
    event.resourceId ?? null,
    event.details ? JSON.stringify(event.details) : null,
    event.ip ?? '',
    event.userAgent ?? '',
    timestamp
  );

  return {
    id,
    userId: event.userId,
    teamId: event.teamId,
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    details: event.details ?? {},
    ip: event.ip ?? '',
    userAgent: event.userAgent ?? '',
    timestamp,
  };
}

/**
 * Get audit logs with filters
 */
export function getAuditLogs(teamId: string, filters: AuditLogFilters = {}): AuditLog[] {
  const conditions: string[] = ['team_id = ?'];
  const values: any[] = [teamId];

  if (filters.userId) {
    conditions.push('user_id = ?');
    values.push(filters.userId);
  }
  if (filters.action) {
    conditions.push('action = ?');
    values.push(filters.action);
  }
  if (filters.resource) {
    conditions.push('resource = ?');
    values.push(filters.resource);
  }
  if (filters.startTime) {
    conditions.push('timestamp >= ?');
    values.push(filters.startTime);
  }
  if (filters.endTime) {
    conditions.push('timestamp <= ?');
    values.push(filters.endTime);
  }

  const whereClause = conditions.join(' AND ');
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  const rows = db.prepare(`
    SELECT * FROM audit_logs WHERE ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset) as any[];

  return rows.map(mapRow);
}

/**
 * Get audit logs for a user across all teams
 */
export function getUserAuditLogs(userId: string, filters: AuditLogFilters = {}): AuditLog[] {
  const conditions: string[] = ['user_id = ?'];
  const values: any[] = [userId];

  if (filters.action) {
    conditions.push('action = ?');
    values.push(filters.action);
  }
  if (filters.startTime) {
    conditions.push('timestamp >= ?');
    values.push(filters.startTime);
  }
  if (filters.endTime) {
    conditions.push('timestamp <= ?');
    values.push(filters.endTime);
  }

  const whereClause = conditions.join(' AND ');
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;

  const rows = db.prepare(`
    SELECT * FROM audit_logs WHERE ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset) as any[];

  return rows.map(mapRow);
}

/**
 * Export audit logs in a specified format
 */
export function exportAuditLogs(teamId: string, format: 'json' | 'csv' = 'json'): string {
  const logs = getAuditLogs(teamId, { limit: 10000 });

  if (format === 'csv') {
    const header = 'id,userId,teamId,action,resource,resourceId,ip,timestamp,details';
    const rows = logs.map((log) => {
      const details = JSON.stringify(log.details).replace(/"/g, '""');
      return `${log.id},${log.userId},${log.teamId ?? ''},${log.action},${log.resource},${log.resourceId ?? ''},${log.ip},${log.timestamp},"${details}"`;
    });
    return [header, ...rows].join('\n');
  }

  return JSON.stringify(logs, null, 2);
}

/**
 * Count audit logs for a team
 */
export function countAuditLogs(teamId: string, filters: AuditLogFilters = {}): number {
  const conditions: string[] = ['team_id = ?'];
  const values: any[] = [teamId];

  if (filters.userId) {
    conditions.push('user_id = ?');
    values.push(filters.userId);
  }
  if (filters.action) {
    conditions.push('action = ?');
    values.push(filters.action);
  }
  if (filters.startTime) {
    conditions.push('timestamp >= ?');
    values.push(filters.startTime);
  }
  if (filters.endTime) {
    conditions.push('timestamp <= ?');
    values.push(filters.endTime);
  }

  const whereClause = conditions.join(' AND ');
  const row = db.prepare(`SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`).get(...values) as any;
  return row.count;
}

/**
 * Map a database row to an AuditLog
 */
function mapRow(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    teamId: row.team_id ?? undefined,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id ?? undefined,
    details: row.details ? JSON.parse(row.details) : {},
    ip: row.ip ?? '',
    userAgent: row.user_agent ?? '',
    timestamp: row.timestamp,
  };
}

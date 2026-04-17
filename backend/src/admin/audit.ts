/**
 * Admin Audit Logs Module
 * 审计日志管理 API
 */

import { db } from '../db';

export interface AdminAuditLogView {
  id: string;
  userId: string;
  userEmail?: string;
  teamId?: string;
  teamName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ip: string;
  userAgent: string;
  timestamp: number;
}

export interface AuditLogListOptions {
  userId?: string;
  teamId?: string;
  action?: string;
  resource?: string;
  startTime?: number;
  endTime?: number;
  search?: string;
  sortBy?: 'timestamp' | 'action' | 'user';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  uniqueUsers: number;
  uniqueTeams: number;
  actionCounts: { action: string; count: number }[];
  resourceCounts: { resource: string; count: number }[];
  dailyCounts: { date: string; count: number }[];
}

// 审计日志列表
export function getAuditLogs(options: AuditLogListOptions = {}): { logs: AdminAuditLogView[]; total: number } {
  const {
    userId,
    teamId,
    action,
    resource,
    startTime,
    endTime,
    search,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (userId) {
    whereClauses.push('al.user_id = ?');
    params.push(userId);
  }

  if (teamId) {
    whereClauses.push('al.team_id = ?');
    params.push(teamId);
  }

  if (action) {
    whereClauses.push('al.action LIKE ?');
    params.push(`%${action}%`);
  }

  if (resource) {
    whereClauses.push('al.resource = ?');
    params.push(resource);
  }

  if (startTime) {
    whereClauses.push('al.timestamp >= ?');
    params.push(startTime);
  }

  if (endTime) {
    whereClauses.push('al.timestamp <= ?');
    params.push(endTime);
  }

  if (search) {
    whereClauses.push('(u.email LIKE ? OR al.action LIKE ? OR al.details LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 排序映射
  const sortMap: Record<string, string> = {
    timestamp: 'al.timestamp',
    action: 'al.action',
    user: 'u.email',
  };
  const orderBy = sortMap[sortBy] || 'al.timestamp';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 获取总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  // 获取日志列表
  const query = `
    SELECT 
      al.id,
      al.user_id,
      u.email as user_email,
      al.team_id,
      t.name as team_name,
      al.action,
      al.resource,
      al.resource_id,
      al.details,
      al.ip,
      al.user_agent,
      al.timestamp
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN teams t ON al.team_id = t.id
    ${whereClause}
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const logs: AdminAuditLogView[] = rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    teamId: row.team_id || undefined,
    teamName: row.team_name || undefined,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id || undefined,
    details: row.details ? JSON.parse(row.details) : {},
    ip: row.ip || '',
    userAgent: row.user_agent || '',
    timestamp: row.timestamp,
  }));

  return { logs, total };
}

// 导出审计日志
export function exportAuditLogs(
  options: AuditLogListOptions = {},
  format: 'json' | 'csv' = 'json'
): string {
  // 获取所有匹配的日志（限制 10000 条）
  const { logs } = getAuditLogs({ ...options, limit: 10000 });

  if (format === 'csv') {
    const header = 'id,timestamp,userEmail,teamName,action,resource,resourceId,ip,details';
    const rows = logs.map(log => {
      const details = JSON.stringify(log.details).replace(/"/g, '""');
      return `${log.id},${log.timestamp},${log.userEmail || ''},${log.teamName || ''},${log.action},${log.resource},${log.resourceId || ''},${log.ip},"${details}"`;
    });
    return [header, ...rows].join('\n');
  }

  return JSON.stringify(logs, null, 2);
}

// 获取审计日志统计
export function getAuditLogStats(startTime?: number, endTime?: number): AuditLogStats {
  const timeFilter = startTime && endTime
    ? `WHERE timestamp >= ${startTime} AND timestamp <= ${endTime}`
    : startTime
    ? `WHERE timestamp >= ${startTime}`
    : endTime
    ? `WHERE timestamp <= ${endTime}`
    : '';

  // 总日志数
  const totalLogs = (db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${timeFilter}`).get() as any)?.count || 0;

  // 唯一用户数
  const uniqueUsers = (db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM audit_logs ${timeFilter}`).get() as any)?.count || 0;

  // 唯一团队数
  const uniqueTeams = (db.prepare(`SELECT COUNT(DISTINCT team_id) as count FROM audit_logs WHERE team_id IS NOT NULL ${startTime || endTime ? 'AND' : ''} ${timeFilter ? timeFilter.replace('WHERE', 'AND') : ''}`).get() as any)?.count || 0;

  // 操作类型统计
  const actionCounts = db.prepare(`
    SELECT action, COUNT(*) as count 
    FROM audit_logs ${timeFilter}
    GROUP BY action 
    ORDER BY count DESC 
    LIMIT 20
  `).all() as any[];

  // 资源类型统计
  const resourceCounts = db.prepare(`
    SELECT resource, COUNT(*) as count 
    FROM audit_logs ${timeFilter}
    GROUP BY resource 
    ORDER BY count DESC 
    LIMIT 20
  `).all() as any[];

  // 每日统计
  const dailyCounts: { date: string; count: number }[] = [];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateStr: string = d.toISOString().split('T')[0] || '';
    const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

    const result = db.prepare(`
      SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= ? AND timestamp <= ?
    `).get(dayStart, dayEnd) as any;

    dailyCounts.push({
      date: dateStr,
      count: result?.count || 0,
    });
  }

  return {
    totalLogs,
    uniqueUsers,
    uniqueTeams,
    actionCounts,
    resourceCounts,
    dailyCounts,
  };
}

// 获取单个审计日志详情
export function getAuditLogDetail(logId: string): AdminAuditLogView | null {
  const row = db.prepare(`
    SELECT 
      al.id,
      al.user_id,
      u.email as user_email,
      al.team_id,
      t.name as team_name,
      al.action,
      al.resource,
      al.resource_id,
      al.details,
      al.ip,
      al.user_agent,
      al.timestamp
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN teams t ON al.team_id = t.id
    WHERE al.id = ?
  `).get(logId) as any;

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    teamId: row.team_id || undefined,
    teamName: row.team_name || undefined,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id || undefined,
    details: row.details ? JSON.parse(row.details) : {},
    ip: row.ip || '',
    userAgent: row.user_agent || '',
    timestamp: row.timestamp,
  };
}

// 清理过期审计日志（保留指定天数）
export function cleanupAuditLogs(retentionDays: number = 90): number {
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const result = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?').run(cutoffTime);
  return result.changes;
}

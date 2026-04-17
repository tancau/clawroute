/**
 * Admin Export Management Module
 * 数据导出管理后台 API
 */

import { db } from '../db';

export interface ExportJobView {
  id: string;
  teamId: string;
  teamName?: string;
  userId: string;
  userEmail?: string;
  type: 'audit_logs' | 'usage_data' | 'billing_data' | 'user_data' | 'api_key_usage';
  format: 'json' | 'csv' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fileSize: number | null;
  fileUrl: string | null;
  error: string | null;
  filters: Record<string, unknown>;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  expiresAt: number | null;
}

export interface ExportJobListOptions {
  teamId?: string;
  userId?: string;
  type?: string;
  status?: string;
  offset?: number;
  limit?: number;
}

// 导出任务列表
export function listExportJobs(options: ExportJobListOptions = {}): { jobs: ExportJobView[]; total: number } {
  const {
    teamId,
    userId,
    type,
    status,
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (teamId) {
    whereClauses.push('ej.team_id = ?');
    params.push(teamId);
  }

  if (userId) {
    whereClauses.push('ej.user_id = ?');
    params.push(userId);
  }

  if (type) {
    whereClauses.push('ej.type = ?');
    params.push(type);
  }

  if (status) {
    whereClauses.push('ej.status = ?');
    params.push(status);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM export_jobs ej ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  const query = `
    SELECT 
      ej.id,
      ej.team_id,
      t.name as team_name,
      ej.user_id,
      u.email as user_email,
      ej.type,
      ej.format,
      ej.status,
      ej.file_size,
      ej.file_url,
      ej.error,
      ej.filters,
      ej.created_at,
      ej.started_at,
      ej.completed_at,
      ej.expires_at
    FROM export_jobs ej
    LEFT JOIN teams t ON ej.team_id = t.id
    LEFT JOIN users u ON ej.user_id = u.id
    ${whereClause}
    ORDER BY ej.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const jobs: ExportJobView[] = rows.map(row => ({
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    userId: row.user_id,
    userEmail: row.user_email || undefined,
    type: row.type,
    format: row.format,
    status: row.status,
    fileSize: row.file_size,
    fileUrl: row.file_url,
    error: row.error,
    filters: row.filters ? JSON.parse(row.filters) : {},
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
  }));

  return { jobs, total };
}

// 导出任务详情
export function getExportJobDetail(jobId: string): ExportJobView | null {
  const row = db.prepare(`
    SELECT 
      ej.id,
      ej.team_id,
      t.name as team_name,
      ej.user_id,
      u.email as user_email,
      ej.type,
      ej.format,
      ej.status,
      ej.file_size,
      ej.file_url,
      ej.error,
      ej.filters,
      ej.created_at,
      ej.started_at,
      ej.completed_at,
      ej.expires_at
    FROM export_jobs ej
    LEFT JOIN teams t ON ej.team_id = t.id
    LEFT JOIN users u ON ej.user_id = u.id
    WHERE ej.id = ?
  `).get(jobId) as any;

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    userId: row.user_id,
    userEmail: row.user_email || undefined,
    type: row.type,
    format: row.format,
    status: row.status,
    fileSize: row.file_size,
    fileUrl: row.file_url,
    error: row.error,
    filters: row.filters ? JSON.parse(row.filters) : {},
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
  };
}

// 取消导出任务
export function cancelExportJob(jobId: string): boolean {
  const job = db.prepare('SELECT status FROM export_jobs WHERE id = ?').get(jobId) as any;
  if (!job) return false;

  // Can only cancel pending or processing jobs
  if (job.status !== 'pending' && job.status !== 'processing') {
    return false;
  }

  db.prepare("UPDATE export_jobs SET status = 'cancelled', completed_at = ? WHERE id = ?").run(Date.now(), jobId);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'export_job.cancelled',
    JSON.stringify({ jobId }),
    Date.now()
  );

  return true;
}

// 重试导出任务
export function retryExportJob(jobId: string): boolean {
  const job = db.prepare('SELECT status FROM export_jobs WHERE id = ?').get(jobId) as any;
  if (!job) return false;

  // Can only retry failed jobs
  if (job.status !== 'failed') {
    return false;
  }

  db.prepare("UPDATE export_jobs SET status = 'pending', error = NULL, started_at = NULL, completed_at = NULL WHERE id = ?").run(jobId);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'export_job.retried',
    JSON.stringify({ jobId }),
    Date.now()
  );

  return true;
}

// 清理过期的导出文件
export function cleanupExpiredExports(): number {
  const now = Date.now();
  const result = db.prepare('UPDATE export_jobs SET file_url = NULL, file_size = NULL WHERE expires_at < ? AND file_url IS NOT NULL').run(now);
  return result.changes;
}

// 获取导出统计
export function getExportStats(): {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
} {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM export_jobs
  `).get() as any;

  return {
    totalJobs: stats?.total || 0,
    pendingJobs: stats?.pending || 0,
    processingJobs: stats?.processing || 0,
    completedJobs: stats?.completed || 0,
    failedJobs: stats?.failed || 0,
    cancelledJobs: stats?.cancelled || 0,
  };
}

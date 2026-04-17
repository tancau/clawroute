import { db } from '../db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ==================== Types ====================

export interface ExportJob {
  id: string;
  teamId: string;
  userId: string;
  type: 'analytics' | 'usage' | 'earnings' | 'audit';
  format: 'csv' | 'json' | 'xlsx';
  filters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: number;
  createdAt: number;
}

export type ExportType = ExportJob['type'];
export type ExportFormat = ExportJob['format'];

// ==================== Table Init ====================

export function initExportTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      format TEXT NOT NULL,
      filters TEXT,
      status TEXT DEFAULT 'pending',
      download_url TEXT,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_export_jobs_team ON export_jobs(team_id);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_export_jobs_expires ON export_jobs(expires_at);
  `);
}

// ==================== Export Job Management ====================

export function createExportJob(
  teamId: string,
  userId: string,
  type: ExportType,
  format: ExportFormat,
  filters: Record<string, any> = {}
): ExportJob {
  // Validate
  const validTypes: ExportType[] = ['analytics', 'usage', 'earnings', 'audit'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid export type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const validFormats: ExportFormat[] = ['csv', 'json', 'xlsx'];
  if (!validFormats.includes(format)) {
    throw new Error(`Invalid export format: ${format}. Must be one of: ${validFormats.join(', ')}`);
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  db.prepare(
    'INSERT INTO export_jobs (id, team_id, user_id, type, format, filters, status, download_url, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, teamId, userId, type, format, JSON.stringify(filters), 'pending', null, expiresAt, now);

  return {
    id,
    teamId,
    userId,
    type,
    format,
    filters,
    status: 'pending',
    expiresAt,
    createdAt: now,
  };
}

export function getExportJob(jobId: string): ExportJob | null {
  const row = db.prepare('SELECT * FROM export_jobs WHERE id = ?').get(jobId) as any;
  return row ? mapExportRow(row) : null;
}

export function getExportJobs(teamId: string, limit = 50): ExportJob[] {
  const rows = db.prepare('SELECT * FROM export_jobs WHERE team_id = ? ORDER BY created_at DESC LIMIT ?').all(teamId, limit) as any[];
  return rows.map(mapExportRow);
}

export function getUserExportJobs(userId: string, limit = 50): ExportJob[] {
  const rows = db.prepare('SELECT * FROM export_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as any[];
  return rows.map(mapExportRow);
}

// ==================== Export Processing ====================

/**
 * Process an export job: gather data, format, generate download URL.
 */
export function processExportJob(jobId: string): ExportJob {
  const job = getExportJob(jobId);
  if (!job) {
    throw new Error('Export job not found');
  }

  if (job.status === 'completed') {
    return job;
  }

  // Mark as processing
  db.prepare('UPDATE export_jobs SET status = ? WHERE id = ?').run('processing', jobId);

  try {
    // Gather data based on type
    const data = gatherExportData(job.teamId, job.type, job.filters);

    // Format data
    let output: string;
    let contentType: string;
    let extension: string;

    switch (job.format) {
      case 'csv':
        output = formatAsCSV(data);
        contentType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
        output = formatAsJSON(data);
        contentType = 'application/json';
        extension = 'json';
        break;
      case 'xlsx':
        // Simplified: output as CSV with xlsx extension indicator
        // In production, use a library like exceljs
        output = formatAsCSV(data);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extension = 'xlsx';
        break;
      default:
        throw new Error(`Unsupported format: ${job.format}`);
    }

    // Generate download URL (simplified: store to temp file)
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filename = `export_${job.type}_${job.teamId}_${jobId}.${extension}`;
    const filePath = path.join(exportDir, filename);
    fs.writeFileSync(filePath, output, 'utf-8');

    const downloadUrl = `/v1/exports/${jobId}/download`;

    // Update job
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    db.prepare('UPDATE export_jobs SET status = ?, download_url = ?, expires_at = ? WHERE id = ?')
      .run('completed', downloadUrl, expiresAt, jobId);

    return getExportJob(jobId)!;
  } catch (error) {
    db.prepare('UPDATE export_jobs SET status = ? WHERE id = ?').run('failed', jobId);
    throw error;
  }
}

export function getDownloadUrl(jobId: string): { url: string; expired: boolean } | null {
  const job = getExportJob(jobId);
  if (!job || !job.downloadUrl) return null;

  const expired = job.expiresAt ? job.expiresAt < Date.now() : false;

  return { url: job.downloadUrl, expired };
}

export function deleteExportJob(jobId: string): boolean {
  const result = db.prepare('DELETE FROM export_jobs WHERE id = ?').run(jobId);
  return result.changes > 0;
}

export function cleanupExpiredJobs(): number {
  const result = db.prepare('DELETE FROM export_jobs WHERE expires_at < ?').run(Date.now());
  return result.changes;
}

// ==================== Data Gathering ====================

function gatherExportData(teamId: string, type: ExportType, filters: Record<string, any>): Record<string, any>[] {
  switch (type) {
    case 'analytics': {
      const days = filters.days || 30;
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      const rows = db.prepare(
        'SELECT * FROM usage_logs WHERE user_id IN (SELECT user_id FROM team_members WHERE team_id = ?) AND created_at >= ? ORDER BY created_at DESC'
      ).all(teamId, since) as any[];
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        provider: r.provider,
        model: r.model,
        intent: r.intent,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        costCents: r.cost_cents,
        savedCents: r.saved_cents,
        latencyMs: r.latency_ms,
        createdAt: r.created_at,
      }));
    }

    case 'usage': {
      const days = filters.days || 30;
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      const rows = db.prepare(
        'SELECT * FROM usage_stats WHERE timestamp >= ? ORDER BY timestamp DESC'
      ).all(since) as any[];
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        provider: r.provider,
        model: r.model,
        intent: r.intent,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        costCents: r.cost_cents,
        savedCents: r.saved_cents,
        timestamp: r.timestamp,
      }));
    }

    case 'earnings': {
      const rows = db.prepare(
        'SELECT * FROM earning_records WHERE user_id IN (SELECT user_id FROM team_members WHERE team_id = ?) ORDER BY created_at DESC'
      ).all(teamId) as any[];
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        keyId: r.key_id,
        provider: r.provider,
        model: r.model,
        usageTokens: r.usage_tokens,
        costCents: r.cost_cents,
        earningCents: r.earning_cents,
        tier: r.tier,
        period: r.period,
        status: r.status,
        createdAt: r.created_at,
      }));
    }

    case 'audit': {
      const rows = db.prepare(
        'SELECT * FROM audit_logs WHERE team_id = ? ORDER BY timestamp DESC'
      ).all(teamId) as any[];
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        teamId: r.team_id,
        action: r.action,
        resource: r.resource,
        resourceId: r.resource_id,
        details: r.details,
        ip: r.ip,
        timestamp: r.timestamp,
      }));
    }

    default:
      return [];
  }
}

// ==================== Formatters ====================

function formatAsJSON(data: Record<string, any>[]): string {
  return JSON.stringify(data, null, 2);
}

function formatAsCSV(data: Record<string, any>[]): string {
  if (data.length === 0 || !data[0]) return '';

  const headers = Object.keys(data[0]);
  const escapeCSV = (val: any): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.join(',');
  const dataLines = data.map(row => headers.map(h => escapeCSV(row[h])).join(','));

  return [headerLine, ...dataLines].join('\n');
}

// ==================== Helpers ====================

function mapExportRow(row: any): ExportJob {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    type: row.type,
    format: row.format,
    filters: JSON.parse(row.filters || '{}'),
    status: row.status,
    downloadUrl: row.download_url ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

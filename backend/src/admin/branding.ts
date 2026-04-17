/**
 * Admin Branding Management Module
 * 品牌定制管理后台 API
 */

import { db } from '../db';

export interface BrandConfigView {
  id: string;
  teamId: string;
  teamName?: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  companyName: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  favicon: string | null;
  loginBackground: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  updatedAt: number;
}

export interface BrandConfigListOptions {
  teamId?: string;
  status?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface DomainVerificationResult {
  domain: string;
  verified: boolean;
  method: string;
  record: string;
  expectedValue: string;
  actualValue?: string;
}

// 品牌配置列表
export function listBrandConfigs(options: BrandConfigListOptions = {}): { configs: BrandConfigView[]; total: number } {
  const {
    teamId,
    status,
    search,
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (teamId) {
    whereClauses.push('bc.team_id = ?');
    params.push(teamId);
  }

  if (status) {
    whereClauses.push('bc.status = ?');
    params.push(status);
  }

  if (search) {
    whereClauses.push('(t.name LIKE ? OR bc.company_name LIKE ? OR bc.custom_domain LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM brand_configs bc LEFT JOIN teams t ON bc.team_id = t.id ${whereClause}`;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  const query = `
    SELECT 
      bc.id,
      bc.team_id,
      t.name as team_name,
      bc.logo,
      bc.primary_color,
      bc.secondary_color,
      bc.company_name,
      bc.custom_domain,
      bc.custom_domain_verified,
      bc.favicon,
      bc.login_background,
      bc.status,
      bc.created_at,
      bc.updated_at
    FROM brand_configs bc
    LEFT JOIN teams t ON bc.team_id = t.id
    ${whereClause}
    ORDER BY bc.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const configs: BrandConfigView[] = rows.map(row => ({
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    logo: row.logo,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    companyName: row.company_name,
    customDomain: row.custom_domain,
    customDomainVerified: row.custom_domain_verified === 1,
    favicon: row.favicon,
    loginBackground: row.login_background,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { configs, total };
}

// 品牌配置详情
export function getBrandConfigDetail(configId: string): BrandConfigView | null {
  const row = db.prepare(`
    SELECT 
      bc.id,
      bc.team_id,
      t.name as team_name,
      bc.logo,
      bc.primary_color,
      bc.secondary_color,
      bc.company_name,
      bc.custom_domain,
      bc.custom_domain_verified,
      bc.favicon,
      bc.login_background,
      bc.status,
      bc.created_at,
      bc.updated_at
    FROM brand_configs bc
    LEFT JOIN teams t ON bc.team_id = t.id
    WHERE bc.id = ?
  `).get(configId) as any;

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.team_id,
    teamName: row.team_name || undefined,
    logo: row.logo,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    companyName: row.company_name,
    customDomain: row.custom_domain,
    customDomainVerified: row.custom_domain_verified === 1,
    favicon: row.favicon,
    loginBackground: row.login_background,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 审批通过品牌配置
export function approveBrandConfig(configId: string): void {
  db.prepare("UPDATE brand_configs SET status = 'approved', updated_at = ? WHERE id = ?").run(Date.now(), configId);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'brand_config.approved',
    JSON.stringify({ configId }),
    Date.now()
  );
}

// 拒绝品牌配置
export function rejectBrandConfig(configId: string, reason?: string): void {
  db.prepare("UPDATE brand_configs SET status = 'rejected', updated_at = ? WHERE id = ?").run(Date.now(), configId);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, details, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'admin',
    'brand_config.rejected',
    JSON.stringify({ configId, reason: reason || 'Admin rejected' }),
    Date.now()
  );
}

// 验证自定义域名
export function verifyCustomDomain(domain: string): DomainVerificationResult {
  // Check if domain exists in brand configs
  const config = db.prepare('SELECT * FROM brand_configs WHERE custom_domain = ?').get(domain) as any;
  if (!config) {
    return {
      domain,
      verified: false,
      method: 'CNAME',
      record: `clawroute-verification=${domain}`,
      expectedValue: 'verify.clawroute.com',
    };
  }

  // In production, we would actually check DNS records
  // For now, simulate verification
  const verificationToken = `clawroute-verify-${config.team_id}`;
  
  return {
    domain,
    verified: config.custom_domain_verified === 1,
    method: 'CNAME',
    record: domain,
    expectedValue: 'cdn.clawroute.com',
    actualValue: config.custom_domain_verified === 1 ? 'cdn.clawroute.com' : undefined,
  };
}

// 标记域名已验证
export function markDomainVerified(domain: string): boolean {
  const result = db.prepare('UPDATE brand_configs SET custom_domain_verified = 1, updated_at = ? WHERE custom_domain = ?').run(Date.now(), domain);
  return result.changes > 0;
}

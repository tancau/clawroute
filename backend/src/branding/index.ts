import { db } from '../db';
import crypto from 'crypto';

// ==================== Types ====================

export interface BrandConfig {
  teamId: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  customCss?: string;
  emailTemplates?: {
    welcome?: string;
    passwordReset?: string;
  };
  features?: {
    hideClawRouterBranding: boolean;
    customFooter: string;
  };
}

export interface CustomDomain {
  domain: string;
  teamId: string;
  verificationToken: string;
  verified: boolean;
  sslEnabled: boolean;
  createdAt: number;
}

// ==================== Table Init ====================

export function initBrandingTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_configs (
      team_id TEXT PRIMARY KEY,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#00c9ff',
      secondary_color TEXT DEFAULT '#92fe9d',
      custom_domain TEXT,
      custom_css TEXT,
      email_templates TEXT,
      features TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_domains (
      domain TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      verification_token TEXT,
      verified INTEGER DEFAULT 0,
      ssl_enabled INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_custom_domains_team ON custom_domains(team_id);
    CREATE INDEX IF NOT EXISTS idx_custom_domains_verified ON custom_domains(verified);
  `);
}

// ==================== Brand Config CRUD ====================

const DEFAULT_BRAND: Omit<BrandConfig, 'teamId'> = {
  logoUrl: undefined,
  primaryColor: '#00c9ff',
  secondaryColor: '#92fe9d',
  customDomain: undefined,
  customCss: undefined,
  emailTemplates: undefined,
  features: {
    hideClawRouterBranding: false,
    customFooter: '',
  },
};

export function getBrandConfig(teamId: string): BrandConfig {
  const row = db.prepare('SELECT * FROM brand_configs WHERE team_id = ?').get(teamId) as any;
  if (!row) {
    return { teamId, ...DEFAULT_BRAND };
  }
  return mapBrandRow(row);
}

export function updateBrandConfig(teamId: string, config: Partial<BrandConfig>): BrandConfig {
  const existing = getBrandConfig(teamId);
  const merged: BrandConfig = {
    teamId,
    logoUrl: config.logoUrl !== undefined ? config.logoUrl : existing.logoUrl,
    primaryColor: config.primaryColor !== undefined ? config.primaryColor : existing.primaryColor,
    secondaryColor: config.secondaryColor !== undefined ? config.secondaryColor : existing.secondaryColor,
    customDomain: config.customDomain !== undefined ? config.customDomain : existing.customDomain,
    customCss: config.customCss !== undefined ? config.customCss : existing.customCss,
    emailTemplates: config.emailTemplates !== undefined ? config.emailTemplates : existing.emailTemplates,
    features: config.features !== undefined ? config.features : existing.features,
  };

  // Validate colors if provided
  if (merged.primaryColor && !isValidColor(merged.primaryColor)) {
    throw new Error(`Invalid primary color: ${merged.primaryColor}`);
  }
  if (merged.secondaryColor && !isValidColor(merged.secondaryColor)) {
    throw new Error(`Invalid secondary color: ${merged.secondaryColor}`);
  }

  const now = Date.now();
  const emailTemplates = merged.emailTemplates ? JSON.stringify(merged.emailTemplates) : null;
  const features = merged.features ? JSON.stringify(merged.features) : null;

  db.prepare(`
    INSERT INTO brand_configs (team_id, logo_url, primary_color, secondary_color, custom_domain, custom_css, email_templates, features, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(team_id) DO UPDATE SET
      logo_url = excluded.logo_url,
      primary_color = excluded.primary_color,
      secondary_color = excluded.secondary_color,
      custom_domain = excluded.custom_domain,
      custom_css = excluded.custom_css,
      email_templates = excluded.email_templates,
      features = excluded.features,
      updated_at = excluded.updated_at
  `).run(
    teamId,
    merged.logoUrl ?? null,
    merged.primaryColor ?? '#00c9ff',
    merged.secondaryColor ?? '#92fe9d',
    merged.customDomain ?? null,
    merged.customCss ?? null,
    emailTemplates,
    features,
    now
  );

  return merged;
}

export function deleteBrandConfig(teamId: string): boolean {
  const result = db.prepare('DELETE FROM brand_configs WHERE team_id = ?').run(teamId);
  return result.changes > 0;
}

// ==================== Custom Domain Management ====================

export function validateCustomDomain(domain: string): { valid: boolean; error?: string } {
  // Basic domain format validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return { valid: false, error: 'Invalid domain format' };
  }

  // Check if domain is already taken by another team
  const existing = db.prepare('SELECT * FROM custom_domains WHERE domain = ?').get(domain) as any;
  if (existing) {
    return { valid: false, error: 'Domain is already registered' };
  }

  // Block common domains
  const blockedDomains = ['clawroute.com', 'clawrouter.com', 'localhost', '127.0.0.1'];
  if (blockedDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
    return { valid: false, error: 'This domain is not available' };
  }

  return { valid: true };
}

export function registerCustomDomain(teamId: string, domain: string): CustomDomain {
  const validation = validateCustomDomain(domain);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const verificationToken = `verify_${crypto.randomBytes(16).toString('hex')}`;
  const now = Date.now();

  db.prepare(
    'INSERT INTO custom_domains (domain, team_id, verification_token, verified, ssl_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(domain, teamId, verificationToken, 0, 0, now);

  return {
    domain,
    teamId,
    verificationToken,
    verified: false,
    sslEnabled: false,
    createdAt: now,
  };
}

export function verifyCustomDomain(domain: string, token: string): boolean {
  const row = db.prepare('SELECT * FROM custom_domains WHERE domain = ?').get(domain) as any;
  if (!row) return false;

  if (row.verification_token !== token) {
    return false;
  }

  // In production: perform DNS TXT record verification here
  // Simplified: accept the token match as verification
  db.prepare('UPDATE custom_domains SET verified = 1 WHERE domain = ?').run(domain);

  // Update brand config if it references this domain
  db.prepare('UPDATE brand_configs SET custom_domain = ? WHERE team_id = ?').run(domain, row.team_id);

  return true;
}

export function getCustomDomain(domain: string): CustomDomain | null {
  const row = db.prepare('SELECT * FROM custom_domains WHERE domain = ?').get(domain) as any;
  return row ? mapDomainRow(row) : null;
}

export function getTeamCustomDomains(teamId: string): CustomDomain[] {
  const rows = db.prepare('SELECT * FROM custom_domains WHERE team_id = ? ORDER BY created_at DESC').all(teamId) as any[];
  return rows.map(mapDomainRow);
}

export function deleteCustomDomain(domain: string): boolean {
  const result = db.prepare('DELETE FROM custom_domains WHERE domain = ?').run(domain);
  return result.changes > 0;
}

export function enableSSL(domain: string): boolean {
  const row = db.prepare('SELECT * FROM custom_domains WHERE domain = ? AND verified = 1').get(domain) as any;
  if (!row) return false;

  // In production: provision SSL certificate (e.g., via Let's Encrypt)
  db.prepare('UPDATE custom_domains SET ssl_enabled = 1 WHERE domain = ?').run(domain);
  return true;
}

// ==================== Brand Middleware Helper ====================

/**
 * Resolve brand config from request hostname.
 * Returns the brand config for the team that owns the custom domain,
 * or the default brand if no match.
 */
export function resolveBrandFromHost(hostname: string): BrandConfig | null {
  const domainRow = db.prepare('SELECT * FROM custom_domains WHERE domain = ? AND verified = 1').get(hostname) as any;
  if (!domainRow) return null;

  return getBrandConfig(domainRow.team_id);
}

// ==================== Helpers ====================

function isValidColor(color: string): boolean {
  // Hex color validation
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function mapBrandRow(row: any): BrandConfig {
  return {
    teamId: row.team_id,
    logoUrl: row.logo_url ?? undefined,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    customDomain: row.custom_domain ?? undefined,
    customCss: row.custom_css ?? undefined,
    emailTemplates: row.email_templates ? JSON.parse(row.email_templates) : undefined,
    features: row.features ? JSON.parse(row.features) : { hideClawRouterBranding: false, customFooter: '' },
  };
}

function mapDomainRow(row: any): CustomDomain {
  return {
    domain: row.domain,
    teamId: row.team_id,
    verificationToken: row.verification_token,
    verified: row.verified === 1,
    sslEnabled: row.ssl_enabled === 1,
    createdAt: row.created_at,
  };
}

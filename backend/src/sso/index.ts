import { db } from '../db';
import crypto from 'crypto';

// ==================== Types ====================

export interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oauth2' | 'oidc';
  config: Record<string, any>;
  enabled: boolean;
}

export interface SSOConnection {
  id: string;
  teamId: string;
  providerId: string;
  domain: string;
  config: {
    entityId?: string;      // SAML
    ssoUrl?: string;        // SAML
    certificate?: string;   // SAML
    clientId?: string;      // OAuth/OIDC
    clientSecret?: string;  // OAuth/OIDC
    discoveryUrl?: string;  // OIDC
  };
  createdAt: number;
}

export interface SSOSession {
  id: string;
  userId: string;
  connectionId: string;
  ssoUserId: string;
  attributes: Record<string, any>;
  expiresAt: number;
  createdAt: number;
}

// Built-in OAuth/OIDC provider presets
const BUILTIN_PROVIDERS: Omit<SSOProvider, 'id'>[] = [
  {
    name: 'Google Workspace',
    type: 'oidc',
    config: {
      discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
      scope: 'openid email profile',
    },
    enabled: true,
  },
  {
    name: 'Microsoft Azure AD',
    type: 'oidc',
    config: {
      discoveryUrl: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
      scope: 'openid email profile',
    },
    enabled: true,
  },
  {
    name: 'Okta',
    type: 'oidc',
    config: {
      // discoveryUrl must be provided per-tenant: https://{yourOktaDomain}/.well-known/openid-configuration
      scope: 'openid email profile',
    },
    enabled: true,
  },
  {
    name: 'Auth0',
    type: 'oidc',
    config: {
      // discoveryUrl must be provided per-tenant: https://{yourAuth0Domain}/.well-known/openid-configuration
      scope: 'openid email profile',
    },
    enabled: true,
  },
  {
    name: 'Generic SAML',
    type: 'saml',
    config: {},
    enabled: true,
  },
  {
    name: 'Generic OAuth2',
    type: 'oauth2',
    config: {},
    enabled: true,
  },
];

// ==================== Table Init ====================

export function initSSOTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sso_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT,
      enabled INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sso_connections (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      config TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(team_id)
    );

    CREATE TABLE IF NOT EXISTS sso_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      connection_id TEXT NOT NULL,
      sso_user_id TEXT,
      attributes TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sso_connections_team ON sso_connections(team_id);
    CREATE INDEX IF NOT EXISTS idx_sso_connections_domain ON sso_connections(domain);
    CREATE INDEX IF NOT EXISTS idx_sso_sessions_user ON sso_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires ON sso_sessions(expires_at);
  `);

  // Seed built-in providers if table is empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM sso_providers').get() as any).c;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO sso_providers (id, name, type, config, enabled) VALUES (?, ?, ?, ?, ?)'
    );
    for (const p of BUILTIN_PROVIDERS) {
      const id = p.name.toLowerCase().replace(/\s+/g, '-');
      insert.run(id, p.name, p.type, JSON.stringify(p.config), p.enabled ? 1 : 0);
    }
  }
}

// ==================== Provider Management ====================

export function listSSOProviders(): SSOProvider[] {
  const rows = db.prepare('SELECT * FROM sso_providers ORDER BY name').all() as any[];
  return rows.map(mapProviderRow);
}

export function getSSOProvider(id: string): SSOProvider | null {
  const row = db.prepare('SELECT * FROM sso_providers WHERE id = ?').get(id) as any;
  return row ? mapProviderRow(row) : null;
}

// ==================== Connection Management ====================

export function createSSOConnection(
  teamId: string,
  providerId: string,
  domain: string,
  config: SSOConnection['config']
): SSOConnection {
  // Validate provider exists
  const provider = getSSOProvider(providerId);
  if (!provider) {
    throw new Error(`SSO provider '${providerId}' not found`);
  }

  // Validate domain format
  if (!isValidDomain(domain)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(
    'INSERT INTO sso_connections (id, team_id, provider_id, domain, config, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, teamId, providerId, domain, JSON.stringify(config), now);

  return { id, teamId, providerId, domain, config, createdAt: now };
}

export function getSSOConnection(teamId: string): SSOConnection | null {
  const row = db.prepare('SELECT * FROM sso_connections WHERE team_id = ?').get(teamId) as any;
  return row ? mapConnectionRow(row) : null;
}

export function getSSOConnectionByDomain(domain: string): SSOConnection | null {
  const row = db.prepare('SELECT * FROM sso_connections WHERE domain = ?').get(domain) as any;
  return row ? mapConnectionRow(row) : null;
}

export function deleteSSOConnection(teamId: string): boolean {
  const result = db.prepare('DELETE FROM sso_connections WHERE team_id = ?').run(teamId);
  return result.changes > 0;
}

export function updateSSOConnection(
  teamId: string,
  updates: { domain?: string; config?: SSOConnection['config'] }
): SSOConnection | null {
  const existing = getSSOConnection(teamId);
  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.domain !== undefined) {
    if (!isValidDomain(updates.domain)) {
      throw new Error(`Invalid domain format: ${updates.domain}`);
    }
    setClauses.push('domain = ?');
    values.push(updates.domain);
  }

  if (updates.config !== undefined) {
    setClauses.push('config = ?');
    values.push(JSON.stringify(updates.config));
  }

  if (setClauses.length === 0) return existing;

  values.push(teamId);
  db.prepare(`UPDATE sso_connections SET ${setClauses.join(', ')} WHERE team_id = ?`).run(...values);

  return getSSOConnection(teamId);
}

// ==================== SSO Flow ====================

export interface SSOInitiateResult {
  authorizationUrl: string;
  state: string;
  nonce?: string;
}

/**
 * Initiate SSO login flow.
 * For OAuth2/OIDC: generates authorization URL with state & nonce.
 * For SAML: returns redirect URL (simplified).
 */
export function initiateSSO(connectionId: string, redirectUri: string): SSOInitiateResult {
  const conn = db.prepare('SELECT * FROM sso_connections WHERE id = ?').get(connectionId) as any;
  if (!conn) {
    throw new Error('SSO connection not found');
  }

  const provider = getSSOProvider(conn.provider_id);
  if (!provider) {
    throw new Error('SSO provider not found');
  }

  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');

  let authorizationUrl = '';

  const config = { ...provider.config, ...JSON.parse(conn.config || '{}') };

  if (provider.type === 'oidc') {
    // Build OIDC authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId || '',
      redirect_uri: redirectUri,
      scope: config.scope || 'openid email profile',
      state,
      nonce,
    });

    if (config.discoveryUrl) {
      // Simplified: construct from well-known pattern
      const baseUrl = config.discoveryUrl.replace('/.well-known/openid-configuration', '');
      authorizationUrl = `${baseUrl}/authorize?${params.toString()}`;
    } else if (config.authorizationUrl) {
      authorizationUrl = `${config.authorizationUrl}?${params.toString()}`;
    } else {
      throw new Error('OIDC discoveryUrl or authorizationUrl is required');
    }
  } else if (provider.type === 'oauth2') {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId || '',
      redirect_uri: redirectUri,
      scope: config.scope || 'email profile',
      state,
    });

    authorizationUrl = config.authorizeUrl
      ? `${config.authorizeUrl}?${params.toString()}}`
      : `https://${conn.domain}/oauth2/authorize?${params.toString()}`;
  } else if (provider.type === 'saml') {
    // SAML: redirect to SP-initiated SSO URL
    authorizationUrl = config.ssoUrl || `https://${conn.domain}/saml/sso`;
  }

  // Store state for verification (in production, use Redis or DB)
  // For simplicity, we create a temporary session record
  const sessionId = crypto.randomUUID();
  db.prepare(
    'INSERT INTO sso_sessions (id, user_id, connection_id, sso_user_id, attributes, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(sessionId, '', connectionId, '', JSON.stringify({ state, nonce, redirectUri }), Date.now() + 10 * 60 * 1000, Date.now());

  return { authorizationUrl, state, nonce };
}

export interface SSOCallbackResult {
  success: boolean;
  userId?: string;
  email?: string;
  name?: string;
  accessToken?: string;
  error?: string;
}

/**
 * Handle SSO callback.
 * For OIDC: exchange code for tokens and extract user info.
 * For OAuth2: exchange code for access token.
 * For SAML: parse assertion (simplified).
 */
export async function handleSSOCallback(
  providerType: 'saml' | 'oauth2' | 'oidc',
  params: {
    code?: string;
    state?: string;
    error?: string;
    connectionId: string;
    redirectUri: string;
  }
): Promise<SSOCallbackResult> {
  if (params.error) {
    return { success: false, error: params.error };
  }

  if (!params.code) {
    return { success: false, error: 'Missing authorization code' };
  }

  const conn = db.prepare('SELECT * FROM sso_connections WHERE id = ?').get(params.connectionId) as any;
  if (!conn) {
    return { success: false, error: 'SSO connection not found' };
  }

  const provider = getSSOProvider(conn.provider_id);
  if (!provider) {
    return { success: false, error: 'SSO provider not found' };
  }

  // Verify state
  const sessionRow = db.prepare(
    "SELECT * FROM sso_sessions WHERE connection_id = ? AND json_extract(attributes, '$.state') = ?"
  ).get(params.connectionId, params.state) as any;

  if (!sessionRow) {
    return { success: false, error: 'Invalid or expired state parameter' };
  }

  const config = { ...provider.config, ...JSON.parse(conn.config || '{}') };
  let email = '';
  let name = '';
  let ssoUserId = '';

  if (providerType === 'oidc' || providerType === 'oauth2') {
    // Exchange code for tokens
    try {
      const tokenResponse = await exchangeCodeForTokens(config, params.code, params.redirectUri);
      if (!tokenResponse.access_token) {
        return { success: false, error: 'Failed to obtain access token' };
      }

      // Extract user info from id_token or userinfo endpoint
      if (tokenResponse.id_token) {
        const decoded = decodeJWT(tokenResponse.id_token);
        email = decoded.email || '';
        name = decoded.name || '';
        ssoUserId = decoded.sub || '';
      } else {
        // Fetch from userinfo endpoint
        const userInfo = await fetchUserInfo(config, tokenResponse.access_token);
        email = userInfo.email || '';
        name = userInfo.name || '';
        ssoUserId = userInfo.sub || '';
      }
    } catch (err) {
      return { success: false, error: `Token exchange failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
    }
  } else {
    // SAML: simplified - in production, parse SAML assertion
    email = `${params.state}@${conn.domain}`;
    name = params.state || '';
    ssoUserId = params.state || '';
  }

  // Verify domain access
  const domainVerified = verifySSOAccess(email, conn.domain);
  if (!domainVerified) {
    return { success: false, error: `Email domain does not match SSO domain (${conn.domain})` };
  }

  // Create or find user (simplified)
  const accessToken = `sso_at_${crypto.randomUUID()}`;

  // Clean up state session and create real session
  db.prepare('DELETE FROM sso_sessions WHERE id = ?').run(sessionRow.id);
  const sessionExpireAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  db.prepare(
    'INSERT INTO sso_sessions (id, user_id, connection_id, sso_user_id, attributes, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), ssoUserId, params.connectionId, ssoUserId, JSON.stringify({ email, name }), sessionExpireAt, Date.now());

  return {
    success: true,
    userId: ssoUserId,
    email,
    name,
    accessToken,
  };
}

/**
 * Verify that an email belongs to an allowed SSO domain
 */
export function verifySSOAccess(email: string, domain: string): boolean {
  const emailDomain = email.split('@')[1];
  if (!emailDomain) return false;
  return emailDomain.toLowerCase() === domain.toLowerCase();
}

// ==================== Helpers ====================

async function exchangeCodeForTokens(
  config: Record<string, any>,
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token?: string; refresh_token?: string }> {
  const tokenUrl = config.tokenUrl || deriveTokenUrl(config);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId || '',
    client_secret: config.clientSecret || '',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token endpoint returned ${response.status}: ${text}`);
  }

  return response.json() as any;
}

async function fetchUserInfo(
  config: Record<string, any>,
  accessToken: string
): Promise<{ email?: string; name?: string; sub?: string }> {
  const userinfoUrl = config.userinfoUrl || deriveUserinfoUrl(config);

  const response = await fetch(userinfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Userinfo endpoint returned ${response.status}`);
  }

  return response.json() as any;
}

function deriveTokenUrl(config: Record<string, any>): string {
  if (config.discoveryUrl) {
    return config.discoveryUrl
      .replace('/.well-known/openid-configuration', '/token');
  }
  return config.tokenUrl || '';
}

function deriveUserinfoUrl(config: Record<string, any>): string {
  if (config.discoveryUrl) {
    return config.discoveryUrl
      .replace('/.well-known/openid-configuration', '/userinfo');
  }
  return config.userinfoUrl || '';
}

/**
 * Decode JWT payload (no verification - in production, verify signature!)
 */
function decodeJWT(token: string): Record<string, any> {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return {};
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

function isValidDomain(domain: string): boolean {
  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

function mapProviderRow(row: any): SSOProvider {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: JSON.parse(row.config || '{}'),
    enabled: row.enabled === 1,
  };
}

function mapConnectionRow(row: any): SSOConnection {
  return {
    id: row.id,
    teamId: row.team_id,
    providerId: row.provider_id,
    domain: row.domain,
    config: JSON.parse(row.config || '{}'),
    createdAt: row.created_at,
  };
}

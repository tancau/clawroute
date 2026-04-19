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

export function verifyJWT(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  if (!header || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature !== expected) return null;
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
}

interface InternalUser extends SafeUser {
  passwordHash: string;
}

// ===== Token Generation =====

const JWT_SECRET = () => process.env.JWT_SECRET || 'clawrouter-dev-secret';

export function generateTokens(userId: string, tier: string) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = signJWT(
    { userId, tier, iat: now, exp: now + 3600 },
    JWT_SECRET()
  );
  const refreshToken = signJWT(
    { userId, type: 'refresh', iat: now, exp: now + 7 * 86400 },
    JWT_SECRET()
  );
  return { accessToken, refreshToken, expiresIn: 3600 };
}

// ===== Storage Layer =====
// Uses Vercel Postgres when available, falls back to in-memory store

let postgresAvailable: boolean | null = null;

async function getPostgres() {
  if (postgresAvailable === false) return null;
  try {
    const { sql } = await import('@vercel/postgres');
    // Test connection
    await sql`SELECT 1`;
    postgresAvailable = true;
    return sql;
  } catch {
    postgresAvailable = false;
    return null;
  }
}

// In-memory fallback store
const memoryUsers: Map<string, InternalUser> = new Map();

// Ensure Postgres table exists
async function ensureTable() {
  const sql = await getPostgres();
  if (!sql) return;
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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      metadata TEXT
    )
  `;
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  } catch {
    // Index may already exist
  }
}

// ===== User Operations =====

export async function findUserByEmail(email: string): Promise<InternalUser | null> {
  const sql = await getPostgres();

  if (sql) {
    await ensureTable();
    const result = await sql`
      SELECT id, email, password_hash, name, tier, credits, api_key, created_at
      FROM users WHERE email = ${email}
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
    };
  }

  // Fallback: memory store
  return memoryUsers.get(email) || null;
}

export async function createUser(email: string, password: string, name?: string): Promise<SafeUser> {
  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const apiKey = `cr-${crypto.randomBytes(24).toString('hex')}`;
  const now = Date.now();

  const sql = await getPostgres();

  if (sql) {
    await ensureTable();
    await sql`
      INSERT INTO users (id, email, password_hash, name, tier, credits, api_key, created_at, updated_at)
      VALUES (${id}, ${email}, ${passwordHash}, ${name || null}, 'free', 100, ${apiKey}, ${now}, ${now})
    `;
  } else {
    // Fallback: memory store
    const user: InternalUser = {
      id, email, passwordHash, name, tier: 'free', credits: 100, apiKey, createdAt: now,
    };
    memoryUsers.set(email, user);
  }

  return { id, email, name, tier: 'free', credits: 100, apiKey, createdAt: now };
}

export function isUsingPostgres(): boolean {
  return postgresAvailable === true;
}
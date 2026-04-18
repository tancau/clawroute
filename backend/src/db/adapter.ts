/**
 * Database adapter layer - supports SQLite (default) and PostgreSQL
 *
 * Set DATABASE_URL=postgresql://... to use PostgreSQL
 * Otherwise falls back to SQLite (better-sqlite3)
 */

import type { Database as SqliteDb } from 'better-sqlite3';

export interface DbAdapter {
  prepare(sql: string): any;
  exec(sql: string): void;
  pragma(pragma: string): any;
  close(): void;
}

/**
 * Wrap a better-sqlite3 instance as DbAdapter
 */
export function wrapSqlite(db: SqliteDb): DbAdapter {
  return {
    prepare(sql: string) { return db.prepare(sql); },
    exec(sql: string) { db.exec(sql); },
    pragma(pragma: string) { return db.pragma(pragma); },
    close() { db.close(); },
  };
}

/**
 * Create PostgreSQL adapter using pg driver
 * Requires: npm install pg
 */
export async function createPostgresAdapter(connectionString: string): Promise<DbAdapter> {
  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('PostgreSQL driver not installed. Run: npm install pg');
  }

  const pool = new pg.Pool({ connectionString });

  return {
    prepare(sql: string) {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let idx = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++idx}`);

      return {
        run(...params: any[]) {
          return pool.query(pgSql, params);
        },
        get(...params: any[]) {
          return pool.query(pgSql, params).then((r: any) => r.rows[0] || undefined);
        },
        all(...params: any[]) {
          return pool.query(pgSql, params).then((r: any) => r.rows);
        },
      };
    },
    exec(sql: string) {
      // Convert SQLite-specific syntax
      const pgSql = sql
        .replace(/AUTOINCREMENT/g, 'GENERATED ALWAYS AS IDENTITY')
        .replace(/INTEGER PRIMARY KEY/g, 'SERIAL PRIMARY KEY')
        .replace(/TEXT PRIMARY KEY/g, 'TEXT PRIMARY KEY')
        .replace(/DATETIME/g, 'TIMESTAMP')
        .replace(/BOOLEAN/g, 'BOOLEAN');
      return pool.query(pgSql);
    },
    pragma(_pragma: string) {
      // PostgreSQL doesn't have pragmas - no-op
      return [];
    },
    close() {
      return pool.end();
    },
  };
}

/**
 * Detect database type from DATABASE_URL
 */
export function isPostgresUrl(): boolean {
  const url = process.env.DATABASE_URL || '';
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

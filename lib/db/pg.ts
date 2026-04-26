/**
 * PostgreSQL connection using `postgres` package
 * Replaces `@vercel/postgres` which fails with Supabase connection strings
 * Uses POSTGRES_URL_NON_POOLING for direct, reliable connection
 * Returns results in @vercel/postgres format: { rows, rowCount }
 */

import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;

function getConnection() {
  if (_sql) return _sql;

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL not configured');
  }

  _sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 30,
    prepare: false,
  });

  return _sql;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface QueryResult {
  rows: any[];
  rowCount: number | null;
}

type SqlFn = (strings: TemplateStringsArray, ...values: any[]) => Promise<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Tagged template literal compatible with @vercel/postgres `sql` usage
 * Wraps postgres results to return { rows, rowCount } format
 */
export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult> {
  const conn = getConnection();
  // Cast to avoid strict type mismatch between our unknown[] and postgres's ParameterOrFragment
  const result = (conn as unknown as SqlFn)(strings, ...values);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.then((rows: any) => ({
    rows: rows,
    rowCount: rows.count,
  }));
}
import { NextResponse } from 'next/server';

export async function GET() {
  const results: {
    env: Record<string, boolean>;
    connection: { success: boolean; error?: string };
    tableExists: { success: boolean; error?: string; count?: number };
    userQuery: { success: boolean; error?: string; user?: unknown };
  } = {
    env: {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
      POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    },
    connection: { success: false },
    tableExists: { success: false },
    userQuery: { success: false },
  };

  try {
    const { sql } = await import('@vercel/postgres');
    
    // Test connection
    try {
      const connTest = await sql`SELECT 1 as test`;
      results.connection = { success: true };
    } catch (err) {
      results.connection = { 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
      return NextResponse.json(results);
    }

    // Check if users table exists
    try {
      const tableCheck = await sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `;
      const count = Number(tableCheck.rows[0]?.count ?? 0);
      results.tableExists = { success: true, count };
    } catch (err) {
      results.tableExists = { 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
    }

    // Try to query a test user
    try {
      const userResult = await sql`
        SELECT id, email, password_hash 
        FROM users 
        WHERE email = 'test-login-2021@example.com'
      `;
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        results.userQuery = { 
          success: true, 
          user: {
            id: user?.id,
            email: user?.email,
            password_hash_length: (user?.password_hash as string)?.length,
            password_hash_has_colon: (user?.password_hash as string)?.includes(':'),
          }
        };
      } else {
        results.userQuery = { success: true, user: null };
      }
    } catch (err) {
      results.userQuery = { 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      };
    }

  } catch (err) {
    return NextResponse.json({ 
      error: 'Failed to import @vercel/postgres',
      details: err instanceof Error ? err.message : String(err)
    });
  }

  return NextResponse.json(results);
}

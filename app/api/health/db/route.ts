import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { sql } = await import('@vercel/postgres');
    
    // Test connection
    const result = await sql`SELECT 1 as test`;
    
    return NextResponse.json({
      status: 'connected',
      message: 'PostgreSQL connection successful',
      timestamp: new Date().toISOString(),
      rowCount: result.rowCount,
    });
  } catch (err) {
    console.error('[DB Health Check] Connection failed:', err);
    
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      hint: 'Check POSTGRES_URL environment variable',
    }, { status: 500 });
  }
}

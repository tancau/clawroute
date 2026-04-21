import { sql } from '@vercel/postgres';

async function main() {
  try {
    console.log('Testing PostgreSQL connection...');
    
    // 测试连接
    const testResult = await sql`SELECT 1 as test`;
    console.log('Connection test:', testResult.rows[0]);
    
    // 查询用户表
    const users = await sql`
      SELECT id, email, password_hash, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('\nRecent users:');
    for (const user of users.rows) {
      console.log('---');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Password hash length:', user.password_hash?.length || 0);
      console.log('Password hash format check (has colon):', user.password_hash?.includes(':'));
      console.log('Created:', new Date(user.created_at).toISOString());
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
    console.error('Full error:', error);
  }
}

main();

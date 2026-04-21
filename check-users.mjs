import { sql } from '@vercel/postgres';

async function main() {
  try {
    console.log('Testing PostgreSQL connection...\n');
    
    // 查询最近的用户
    const result = await sql`
      SELECT id, email, password_hash, name, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log(`Found ${result.rows.length} users:\n`);
    
    for (const user of result.rows) {
      console.log('---');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Password hash length:', user.password_hash?.length || 0);
      console.log('Password hash preview:', user.password_hash?.substring(0, 50) + '...');
      console.log('Password hash format check (has colon):', user.password_hash?.includes(':'));
      console.log('Created:', new Date(Number(user.created_at)).toISOString());
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
    console.error(error.stack);
  }
}

main();

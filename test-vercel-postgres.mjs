import { sql } from '@vercel/postgres';

async function main() {
  try {
    console.log('Testing @vercel/postgres connection...\n');
    
    // 测试连接
    const testResult = await sql`SELECT 1 as test`;
    console.log('Connection test:', testResult.rows[0]);
    
    // 查询用户
    const result = await sql`
      SELECT id, email, password_hash, name 
      FROM users 
      WHERE email = 'test-login-2021@example.com'
    `;
    
    console.log('\nUser query result:');
    console.log('Rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('User:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

main();

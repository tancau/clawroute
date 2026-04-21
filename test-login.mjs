import crypto from 'crypto';

// 模拟密码哈希和验证
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const parts = stored.split(':');
  const salt = parts[0] ?? '';
  const hash = parts[1] ?? '';
  if (!salt || !hash) {
    console.log('Invalid stored hash format:', stored);
    return false;
  }
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return hash === verifyHash;
}

// 测试
const password = 'Test123456';
const hashed = hashPassword(password);
console.log('Password:', password);
console.log('Hashed:', hashed);
console.log('Hash format check (should have colon):', hashed.includes(':'));
console.log('Verify correct password:', verifyPassword(password, hashed));
console.log('Verify wrong password:', verifyPassword('WrongPassword', hashed));

// 测试边界情况
console.log('\n--- Edge cases ---');
console.log('Empty stored hash:', verifyPassword(password, ''));
console.log('No colon in hash:', verifyPassword(password, 'justsalthere'));
console.log('Only colon:', verifyPassword(password, ':'));

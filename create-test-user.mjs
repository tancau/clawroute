import crypto from 'crypto';

// 密码哈希函数
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

const password = 'Test123456';
const hashedPassword = hashPassword(password);
const userId = crypto.randomUUID();
const apiKey = `cr-${crypto.randomBytes(24).toString('hex')}`;
const now = Date.now();

console.log('User ID:', userId);
console.log('Password hash:', hashedPassword);
console.log('API key:', apiKey);
console.log('Created at:', now);

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * 从环境变量或生成加密密钥
 * 生产环境必须设置 ENCRYPTION_KEY，否则拒绝启动
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey) {
    const key = Buffer.from(envKey, 'hex');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters). Got: ' + key.length + ' bytes');
    }
    return key;
  }
  
  // 生产环境：必须设置 ENCRYPTION_KEY
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: ENCRYPTION_KEY is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
      'Then set it in your environment before starting the server.'
    );
  }
  
  // 开发环境：使用固定密钥
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: Using development encryption key. Set ENCRYPTION_KEY in production!');
  const devKey = crypto.createHash('sha256').update('clawrouter-dev-key').digest();
  return devKey;
}

/**
 * 加密 API Key
 */
export function encryptApiKey(plainKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // 派生密钥
  const derivedKey = crypto.pbkdf2Sync(key, salt, ITERATIONS, 32, 'sha256');
  
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plainKey, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // 格式: salt:iv:authTag:encrypted (全部 hex 编码)
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/**
 * 解密 API Key
 */
export function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey();
  
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [saltHex, ivHex, authTagHex, encryptedHex] = parts;
  
  if (!saltHex || !ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format: missing parts');
  }
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  // 派生密钥
  const derivedKey = crypto.pbkdf2Sync(key, salt, ITERATIONS, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * 生成 Key 预览（脱敏显示）
 * 例如: sk-abc...xyz123
 */
export function generateKeyPreview(key: string): string {
  if (key.length <= 12) {
    return key.slice(0, 4) + '...' + key.slice(-4);
  }
  
  // 保留前 6 位和后 4 位
  return key.slice(0, 6) + '...' + key.slice(-4);
}

/**
 * 验证 Key 格式
 */
export function validateKeyFormat(key: string, provider: string): boolean {
  const patterns: Record<string, RegExp> = {
    openai: /^sk-[a-zA-Z0-9]{20,}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9-]{20,}$/,
    gemini: /^AI[a-zA-Z0-9-_]{20,}$/,
    deepseek: /^sk-[a-zA-Z0-9]{20,}$/,
    qwen: /^sk-[a-zA-Z0-9]{20,}$/,
    grok: /^xai-[a-zA-Z0-9]{20,}$/,
    mistral: /^[a-zA-Z0-9]{32}$/,
    llama: /^.{10,}$/,  // Local/self-hosted, no standard format
    openrouter: /^sk-or-[a-zA-Z0-9-]{20,}$/,
    litellm: /^sk-[a-zA-Z0-9]{20,}$/,
    'infini-ai': /^sk-[a-zA-Z0-9]{20,}$/,
    together: /^[a-zA-Z0-9]{40,}$/,
    fireworks: /^fw-[a-zA-Z0-9]{20,}$/,
    groq: /^gsk_[a-zA-Z0-9]{20,}$/,
    custom: /^.{10,}$/,
  };
  
  const pattern = patterns[provider] ?? patterns.custom ?? /^.{10,}$/;
  return pattern.test(key);
}

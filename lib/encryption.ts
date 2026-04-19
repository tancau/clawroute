/**
 * 加密工具 - 用于安全存储用户的 Provider API Keys
 * 使用 AES-256-GCM 加密
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * 获取加密密钥（从环境变量）
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // 开发环境：使用默认密钥（生产环境必须设置）
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Encryption] Using development encryption key. Set ENCRYPTION_KEY in production!');
      return crypto.scryptSync('clawrouter-dev-key', 'salt', 32);
    }
    throw new Error('ENCRYPTION_KEY environment variable is required in production');
  }
  
  // 如果 key 是 hex 格式
  if (key.length === 64 && /^[0-9a-f]+$/i.test(key)) {
    return Buffer.from(key, 'hex');
  }
  
  // 否则使用 scrypt 派生密钥
  return crypto.scryptSync(key, 'clawrouter-salt', 32);
}

/**
 * 加密文本
 * @param text 要加密的明文
 * @returns 加密后的字符串（hex 格式：iv:authTag:ciphertext）
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 格式: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密文本
 * @param encryptedData 加密的字符串（hex 格式：iv:authTag:ciphertext）
 * @returns 解密后的明文
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivHex, authTagHex, ciphertext] = parts;
  
  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Missing encryption parts');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 脱敏显示 API Key
 * @param apiKey API Key
 * @returns 脱敏后的字符串（如 sk-...abc***）
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '***';
  }
  
  // 显示前缀和后几位
  const prefixLength = Math.min(6, Math.floor(apiKey.length / 3));
  const suffixLength = Math.min(3, Math.floor(apiKey.length / 4));
  
  const prefix = apiKey.slice(0, prefixLength);
  const suffix = apiKey.slice(-suffixLength);
  
  return `${prefix}...${suffix}***`;
}

/**
 * 验证加密密钥是否已配置
 */
export function isEncryptionAvailable(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Provider Keys 类型
 */
export interface ProviderKeys {
  [provider: string]: string;
}

/**
 * 加密 Provider Keys 对象
 */
export function encryptProviderKeys(keys: ProviderKeys): string {
  return encrypt(JSON.stringify(keys));
}

/**
 * 解密 Provider Keys 对象
 */
export function decryptProviderKeys(encrypted: string): ProviderKeys {
  try {
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted) as ProviderKeys;
  } catch {
    return {};
  }
}

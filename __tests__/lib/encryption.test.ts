// @vitest-environment node
// encryption 基于 node:crypto，不依赖 DOM，强制 node 环境。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  maskApiKey,
  isEncryptionAvailable,
  isCustomProvider,
  isStringKey,
  extractCustomProviders,
  toProviderKeys,
  encryptProviderKeys,
  decryptProviderKeys,
  type ProviderKeys,
  type DynamicProviderKeys,
} from '@/lib/encryption';

// 32 字节密钥的 hex 表示（64 字符），走 getEncryptionKey 的 hex 分支
const HEX_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const PASSPHRASE_KEY = 'clawroute-test-passphrase';

describe('encryption — 基础加解密', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', HEX_KEY);
  });

  it('encrypt/decrypt 往返一致', () => {
    const plaintext = 'sk-very-secret-api-key-12345';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('encrypt 输出格式为 iv:authTag:ciphertext（三段 hex）', () => {
    const encrypted = encrypt('hello');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV 16 字节 → 32 hex 字符；authTag 16 字节 → 32 hex 字符
    expect(parts[0]!.length).toBe(32);
    expect(parts[1]!.length).toBe(32);
    expect(parts[2]!.length).toBeGreaterThan(0);
  });

  it('每次加密使用随机 IV（相同明文产生不同密文）', () => {
    const a = encrypt('same-secret');
    const b = encrypt('same-secret');
    expect(a).not.toBe(b);
    // 但两者都能解回原文
    expect(decrypt(a)).toBe('same-secret');
    expect(decrypt(b)).toBe('same-secret');
  });

  it('支持任意二进制可序列化内容（含 unicode）', () => {
    const text = '中文密钥 🔑 émoji';
    expect(decrypt(encrypt(text))).toBe(text);
  });
});

describe('encryption — 错误处理', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', HEX_KEY);
  });

  it('decrypt 拒绝格式错误的数据（段数不对）', () => {
    expect(() => decrypt('not-enough-parts')).toThrow(/Invalid encrypted data format/);
    expect(() => decrypt('only:two')).toThrow(/Invalid encrypted data format/);
  });

  it('decrypt 拒绝空段', () => {
    expect(() => decrypt('::')).toThrow(/Missing encryption parts/);
    expect(() => decrypt('abc::def')).toThrow(/Missing encryption parts/);
  });

  it('decrypt 检测到篡改的 authTag 抛错（GCM 完整性）', () => {
    const encrypted = encrypt('tamper-me');
    const [iv, authTag, ciphertext] = encrypted.split(':');
    // 翻转 authTag 首字符，破坏认证标签
    const tamperedTag = (authTag!.startsWith('0') ? '1' : '0') + authTag!.slice(1);
    expect(() => decrypt(`${iv}:${tamperedTag}:${ciphertext}`)).toThrow();
  });

  it('decrypt 用错误密钥抛错（GCM 认证失败）', () => {
    const encrypted = encrypt('secret-under-hex-key');
    vi.stubEnv('ENCRYPTION_KEY', PASSPHRASE_KEY);
    expect(() => decrypt(encrypted)).toThrow();
  });
});

describe('encryption — 密钥派生', () => {
  it('hex 密钥（64 字符）直接使用', () => {
    vi.stubEnv('ENCRYPTION_KEY', HEX_KEY);
    const encrypted = encrypt('hex-path');
    expect(decrypt(encrypted)).toBe('hex-path');
  });

  it('非 hex 密钥走 scrypt 派生（同一 passphrase 稳定派生）', () => {
    // getEncryptionKey 每次调用都读取 env，scryptSync 同输入同输出，无需重载模块
    vi.stubEnv('ENCRYPTION_KEY', PASSPHRASE_KEY);
    const encrypted = encrypt('scrypt-path');
    expect(decrypt(encrypted)).toBe('scrypt-path');
  });
});

describe('encryption — isEncryptionAvailable', () => {
  it('ENCRYPTION_KEY 已配置时返回 true', () => {
    vi.stubEnv('ENCRYPTION_KEY', HEX_KEY);
    expect(isEncryptionAvailable()).toBe(true);
  });

  it('ENCRYPTION_KEY 缺失时返回 false（不抛错）', () => {
    vi.stubEnv('ENCRYPTION_KEY', '');
    expect(isEncryptionAvailable()).toBe(false);
  });
});

describe('encryption — maskApiKey', () => {
  it('短密钥（<10）整体脱敏为 ***', () => {
    expect(maskApiKey('short')).toBe('***');
    expect(maskApiKey('123456789')).toBe('***'); // 9 字符
    expect(maskApiKey('')).toBe('***');
  });

  it('长密钥保留前缀 + 后缀 + ***', () => {
    // 'sk-abcdefghijklmn' (17 chars): prefix=min(6,5)=5 → 'sk-ab', suffix=min(3,4)=3 → 'lmn'
    const masked = maskApiKey('sk-abcdefghijklmn');
    expect(masked).toBe('sk-ab...lmn***');
    expect(masked).toContain('***');
    // 中段被省略号替换，不泄露
    expect(masked).not.toContain('cdefghij');
  });

  it('不泄露密钥中段', () => {
    const key = 'sk-super-secret-middle-part-XYZ';
    const masked = maskApiKey(key);
    expect(masked).not.toContain('secret-middle');
    expect(masked).toContain('***');
  });
});

describe('encryption — Provider Keys 管理', () => {
  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', HEX_KEY);
  });

  it('encryptProviderKeys/decryptProviderKeys 往返一致', () => {
    const keys: ProviderKeys = {
      openai: 'sk-openai-key',
      anthropic: 'sk-ant-key',
    };
    const encrypted = encryptProviderKeys(keys);
    expect(encrypted).not.toContain('sk-openai-key');
    expect(decryptProviderKeys(encrypted)).toEqual(keys);
  });

  it('decryptProviderKeys 对损坏数据返回空对象（不抛错）', () => {
    expect(decryptProviderKeys('garbage-data')).toEqual({});
    expect(decryptProviderKeys('a:b:c')).toEqual({});
  });

  it('支持自定义 Provider 配置往返', () => {
    const keys: ProviderKeys = {
      customProvider: {
        apiKey: 'custom-key',
        baseUrl: 'https://api.custom.com/v1',
        models: ['model-a', 'model-b'],
        name: 'Custom Provider',
        enabled: true,
        custom: true,
      },
    };
    const encrypted = encryptProviderKeys(keys);
    const decrypted = decryptProviderKeys(encrypted);
    expect(decrypted.customProvider).toMatchObject({
      apiKey: 'custom-key',
      baseUrl: 'https://api.custom.com/v1',
      custom: true,
    });
  });

  it('空 ProviderKeys 加密后解密仍为空对象', () => {
    const encrypted = encryptProviderKeys({});
    expect(decryptProviderKeys(encrypted)).toEqual({});
  });
});

describe('encryption — 类型守卫与转换', () => {
  it('isCustomProvider 识别 custom:true 的对象', () => {
    expect(isCustomProvider({ custom: true, apiKey: 'k', baseUrl: 'u' })).toBe(true);
    expect(isCustomProvider({ custom: false, apiKey: 'k' })).toBe(false);
    expect(isCustomProvider({ apiKey: 'k' })).toBe(false);
    expect(isCustomProvider(null)).toBe(false);
    expect(isCustomProvider('string')).toBe(false);
    expect(isCustomProvider(undefined)).toBe(false);
  });

  it('isStringKey 识别字符串', () => {
    expect(isStringKey('sk-key')).toBe(true);
    expect(isStringKey('')).toBe(true);
    expect(isStringKey(123)).toBe(false);
    expect(isStringKey(null)).toBe(false);
    expect(isStringKey({})).toBe(false);
  });

  it('extractCustomProviders 只提取自定义 Provider', () => {
    const keys: DynamicProviderKeys = {
      openai: 'sk-string-key', // 字符串，不提取
      customA: { custom: true, apiKey: 'a', baseUrl: 'ua', name: 'A' },
      notCustom: { custom: false, apiKey: 'x' },
      customB: { custom: true, apiKey: 'b', baseUrl: 'ub', name: 'B' },
    };
    const customs = extractCustomProviders(keys);
    expect(customs).toHaveLength(2);
    expect(customs.map((c) => c.name).sort()).toEqual(['A', 'B']);
  });

  it('toProviderKeys 过滤掉非法值（仅保留 string 与 custom）', () => {
    const keys: DynamicProviderKeys = {
      openai: 'sk-key',
      custom: { custom: true, apiKey: 'k', baseUrl: 'u', name: 'C' },
      numberVal: 123,
      nullVal: null,
      objNoCustom: { foo: 'bar' },
    };
    const result = toProviderKeys(keys);
    expect(Object.keys(result).sort()).toEqual(['custom', 'openai']);
    expect(result.openai).toBe('sk-key');
    expect(isCustomProvider(result.custom)).toBe(true);
  });

  it('toProviderKeys 处理空对象', () => {
    expect(toProviderKeys({})).toEqual({});
  });
});

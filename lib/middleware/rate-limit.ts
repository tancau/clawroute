/**
 * 速率限制中间件
 * 使用 Upstash Redis 实现分布式速率限制
 * 
 * 功能：
 * 1. 基于用户 ID 或 IP 的速率限制
 * 2. 滑动窗口算法
 * 3. 支持不同 tier 的限制
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// ==================== Redis 客户端 ====================

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;
  
  // 检查环境变量
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!restUrl || !restToken) {
    console.warn('[RateLimit] Upstash Redis not configured, falling back to memory');
    return null;
  }
  
  try {
    redis = new Redis({
      url: restUrl,
      token: restToken,
    });
    return redis;
  } catch (error) {
    console.error('[RateLimit] Failed to create Redis client:', error);
    return null;
  }
}

// ==================== Rate Limit 配置 ====================

interface RateLimitConfig {
  /**
   * 时间窗口内的最大请求数
   */
  maxRequests: number;
  
  /**
   * 时间窗口（秒）
   */
  windowSeconds: number;
  
  /**
   * 描述
   */
  description: string;
}

// Tier-based rate limits (requests per minute)
const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    maxRequests: 20,
    windowSeconds: 60,
    description: 'Free tier: 20 requests per minute',
  },
  pro: {
    maxRequests: 100,
    windowSeconds: 60,
    description: 'Pro tier: 100 requests per minute',
  },
  team: {
    maxRequests: 500,
    windowSeconds: 60,
    description: 'Team tier: 500 requests per minute',
  },
  enterprise: {
    maxRequests: 2000,
    windowSeconds: 60,
    description: 'Enterprise tier: 2000 requests per minute',
  },
};

// ==================== 内存回退 ====================

interface MemoryRateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryRateLimitMap = new Map<string, MemoryRateLimitEntry>();

function checkMemoryRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): { success: boolean; limit: number; reset: number; remaining: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  let entry = memoryRateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryRateLimitMap.set(identifier, entry);
  }
  
  entry.count++;
  
  const remaining = Math.max(0, maxRequests - entry.count);
  const success = entry.count <= maxRequests;
  const reset = Math.ceil((entry.resetAt - now) / 1000);
  
  return { success, limit: maxRequests, reset, remaining };
}

// 清理过期的内存条目
setInterval(() => {
  const now = Date.now();
  memoryRateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      memoryRateLimitMap.delete(key);
    }
  });
}, 60000); // 每分钟清理一次

// ==================== 主函数 ====================

export interface RateLimitResult {
  /**
   * 是否允许请求
   */
  success: boolean;
  
  /**
   * 限制数量
   */
  limit: number;
  
  /**
   * 剩余请求数
   */
  remaining: number;
  
  /**
   * 重置时间（秒）
   */
  reset: number;
  
  /**
   * 是否使用内存回退
   */
  usingMemory: boolean;
}

/**
 * 检查速率限制
 * 
 * @param identifier - 唯一标识符（用户 ID 或 IP）
 * @param tier - 用户等级
 * @returns 速率限制结果
 */
export async function checkRateLimit(
  identifier: string,
  tier: string = 'free'
): Promise<RateLimitResult> {
  const config = TIER_LIMITS[tier] || TIER_LIMITS.free!;
  const redisClient = getRedisClient();
  
  // 如果 Redis 不可用，使用内存回退
  if (!redisClient) {
    const result = checkMemoryRateLimit(
      identifier,
      config.maxRequests,
      config.windowSeconds
    );
    return { ...result, usingMemory: true };
  }
  
  // 创建或获取 Ratelimit 实例
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowSeconds} s`),
      analytics: true,
      prefix: 'hopllm:ratelimit',
    });
  }
  
  try {
    const result = await ratelimit.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: Math.ceil((result.reset - Date.now()) / 1000),
      usingMemory: false,
    };
  } catch (error) {
    console.error('[RateLimit] Redis error, falling back to memory:', error);
    
    const result = checkMemoryRateLimit(
      identifier,
      config.maxRequests,
      config.windowSeconds
    );
    return { ...result, usingMemory: true };
  }
}

/**
 * 获取 tier 的速率限制配置
 */
export function getTierRateLimitConfig(tier: string): RateLimitConfig {
  return TIER_LIMITS[tier] || TIER_LIMITS.free!;
}

// ==================== 特殊场景速率限制器 ====================

/**
 * 登录 API 速率限制器
 * 每个IP每分钟最多 10 次登录尝试
 * 防止暴力破解
 */
let loginRateLimiter: ((identifier: string) => Promise<RateLimitResult>) | null = null;

export function getLoginRateLimiter(): (identifier: string) => Promise<RateLimitResult> {
  if (!loginRateLimiter) {
    loginRateLimiter = createCustomRateLimiter(10, 60, 'login');
  }
  return loginRateLimiter;
}

/**
 * 注册 API 速率限制器
 * 每个IP每小时最多 5 次注册尝试
 */
let registerRateLimiter: ((identifier: string) => Promise<RateLimitResult>) | null = null;

export function getRegisterRateLimiter(): (identifier: string) => Promise<RateLimitResult> {
  if (!registerRateLimiter) {
    registerRateLimiter = createCustomRateLimiter(5, 3600, 'register');
  }
  return registerRateLimiter;
}

/**
 * Chat Completions API 速率限制器
 * 每用户每分钟: 60 次请求
 * 每用户每天: 10,000 次请求
 */
let chatMinuteLimiter: ((identifier: string) => Promise<RateLimitResult>) | null = null;
let chatDailyLimiter: ((identifier: string) => Promise<RateLimitResult>) | null = null;

export interface ChatRateLimitResult {
  allowed: boolean;
  minuteLimit: RateLimitResult;
  dailyLimit?: RateLimitResult;
  error?: string;
  retryAfter?: number;
}

export async function checkChatRateLimit(identifier: string): Promise<ChatRateLimitResult> {
  if (!chatMinuteLimiter) {
    chatMinuteLimiter = createCustomRateLimiter(60, 60, 'chat_minute');
  }
  if (!chatDailyLimiter) {
    chatDailyLimiter = createCustomRateLimiter(10000, 86400, 'chat_daily');
  }
  
  // Check minute limit
  const minuteResult = await chatMinuteLimiter(identifier);
  
  if (!minuteResult.success) {
    return {
      allowed: false,
      minuteLimit: minuteResult,
      error: 'Rate limit exceeded: too many requests per minute',
      retryAfter: minuteResult.reset,
    };
  }
  
  // Check daily limit
  const dailyResult = await chatDailyLimiter(identifier);
  
  if (!dailyResult.success) {
    return {
      allowed: false,
      minuteLimit: minuteResult,
      dailyLimit: dailyResult,
      error: 'Rate limit exceeded: daily quota reached',
      retryAfter: dailyResult.reset,
    };
  }
  
  return {
    allowed: true,
    minuteLimit: minuteResult,
    dailyLimit: dailyResult,
  };
}

/**
 * 创建自定义速率限制器（用于特殊场景）
 */
export function createCustomRateLimiter(
  maxRequests: number,
  windowSeconds: number,
  prefix: string = 'custom'
): (identifier: string) => Promise<RateLimitResult> {
  const redisClient = getRedisClient();
  
  return async (identifier: string): Promise<RateLimitResult> => {
    // 如果 Redis 不可用，使用内存回退
    if (!redisClient) {
      const result = checkMemoryRateLimit(identifier, maxRequests, windowSeconds);
      return { ...result, usingMemory: true };
    }
    
    const customRatelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      prefix: `hopllm:${prefix}`,
    });
    
    try {
      const result = await customRatelimit.limit(identifier);
      
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: Math.ceil((result.reset - Date.now()) / 1000),
        usingMemory: false,
      };
    } catch (error) {
      console.error(`[RateLimit:${prefix}] Redis error:`, error);
      
      const result = checkMemoryRateLimit(identifier, maxRequests, windowSeconds);
      return { ...result, usingMemory: true };
    }
  };
}

/**
 * Provider 级并发控制（maxConcurrent 信号量）— P2-2
 *
 * 防止突发流量打满单个 provider。acquire/release 围绕每次 provider 调用。
 *
 * - Redis（INCR/DECR + TTL 安全网）支持多实例协调
 * - 内存回退（单实例精确计数，无 Redis 时的默认路径）
 * - release() 幂等，可安全在 finally + cancel 中重复调用
 *
 * TTL 仅为进程崩溃恢复的安全网；超长流式请求（> TTL）在 Redis 路径
 * 可能轻微超放，内存路径无此问题。maxConcurrent 默认 10，可按 provider
 * 用环境变量 PROVIDER_{NAME}_MAX_CONCURRENT 或全局 PROVIDER_MAX_CONCURRENT 覆盖。
 *
 * 注：速率维度（RPM/日配额）已由 lib/middleware/rate-limit.ts 覆盖；
 * 本模块只补"并发维度"（in-flight 上限），二者正交。
 */
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

const DEFAULT_MAX_CONCURRENT = 10;
const SLOT_TTL_SECONDS = 300; // 崩溃恢复安全网

let redisClient: Redis | null | undefined;

async function getRedis(): Promise<Redis | null> {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (err) {
    logger.warn({ err }, '[concurrency] Redis init failed, using memory fallback');
    redisClient = null;
    return null;
  }
}

export function getMaxConcurrent(provider: string): number {
  const perProvider = process.env[`PROVIDER_${provider.toUpperCase()}_MAX_CONCURRENT`];
  if (perProvider) {
    const n = parseInt(perProvider, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const global = process.env.PROVIDER_MAX_CONCURRENT;
  if (global) {
    const n = parseInt(global, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return DEFAULT_MAX_CONCURRENT;
}

export interface ProviderSlot {
  provider: string;
  /** 释放槽位。幂等：多次调用只生效一次。 */
  release: () => Promise<void>;
}

// 内存回退：per-provider in-flight 计数
const memoryInFlight = new Map<string, number>();

/**
 * 获取一个 provider 并发槽位。
 * @returns 槽位句柄；null 表示已达并发上限，调用方应回退/拒绝
 */
export async function acquireProviderSlot(provider: string): Promise<ProviderSlot | null> {
  const max = getMaxConcurrent(provider);
  const r = await getRedis();

  if (r) {
    const key = `hopllm:conc:${provider}`;
    try {
      const count = await r.incr(key);
      // 仅首次设置 TTL（避免每次请求延展导致永不过期）
      if (count === 1) {
        await r.expire(key, SLOT_TTL_SECONDS);
      }
      if (count > max) {
        // 超限，回退计数（保守：可能短暂少放行，但不会超放）
        await r.decr(key);
        return null;
      }
      let released = false;
      return {
        provider,
        release: async () => {
          if (released) return;
          released = true;
          try {
            await r.decr(key);
          } catch (err) {
            logger.warn({ err, provider }, '[concurrency] release failed');
          }
        },
      };
    } catch (err) {
      logger.warn({ err, provider }, '[concurrency] redis error, falling back to memory');
      // 落到内存回退
    }
  }

  const current = memoryInFlight.get(provider) ?? 0;
  if (current >= max) return null;
  memoryInFlight.set(provider, current + 1);
  let released = false;
  return {
    provider,
    release: async () => {
      if (released) return;
      released = true;
      const c = memoryInFlight.get(provider) ?? 0;
      memoryInFlight.set(provider, Math.max(0, c - 1));
    },
  };
}

/**
 * 模型目录定时同步调度器
 */

import { syncPrices, syncModels, importFromProviders } from './index';
import { getLastSyncTime, getCatalogStats } from '../db/model-catalog';
import { modelCapabilities } from '../config/providers';
import { logger } from '../monitoring/logger';

export class ModelSyncScheduler {
  private timers: ReturnType<typeof setInterval>[] = [];
  private isRunning = false;

  /**
   * 启动定时同步
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    this.isRunning = true;

    // 检查是否需要首次初始化
    const stats = getCatalogStats();
    if (stats.total === 0) {
      logger.info('Catalog empty, importing from providers.ts');
      const result = importFromProviders(modelCapabilities);
      logger.info(`Imported models`, { inserted: result.inserted, updated: result.updated });
    }

    // 启动时检查是否需要同步
    const lastSync = getLastSyncTime();
    const shouldSyncNow = !lastSync || Date.now() - lastSync > 60 * 60 * 1000; // 1 小时

    if (shouldSyncNow) {
      logger.info('Last sync overdue, running now');
      this.runSyncPrices().catch(err =>
        logger.error('Startup sync failed', { error: err.message })
      );
    }

    // 每 6 小时更新价格
    this.timers.push(
      setInterval(() => {
        this.runSyncPrices().catch(err =>
          logger.error('Price sync failed', { error: err.message })
        );
      }, 6 * 60 * 60 * 1000)
    );

    // 每 24 小时更新模型列表
    this.timers.push(
      setInterval(() => {
        this.runSyncModels().catch(err =>
          logger.error('Model sync failed', { error: err.message })
        );
      }, 24 * 60 * 60 * 1000)
    );

    logger.info('Scheduler started', { priceInterval: '6h', modelInterval: '24h' });
  }

  /**
   * 停止定时同步
   */
  stop(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  /**
   * 手动触发价格同步
   */
  async runSyncPrices(): Promise<void> {
    logger.info('Starting price sync');
    const startTime = Date.now();

    try {
      const result = await syncPrices();
      const duration = Date.now() - startTime;

      if (result.error) {
        logger.error(`Price sync failed`, { error: result.error, duration });
      } else {
        logger.info(
          `Price sync complete`,
          {
            modelsFound: result.modelsFound,
            modelsAdded: result.modelsAdded,
            modelsUpdated: result.modelsUpdated,
            priceChanges: result.priceChanges,
            duration
          }
        );

        if (result.priceAlerts.length > 0) {
          logger.warn(`${result.priceAlerts.length} price alerts`, {
            alerts: result.priceAlerts.slice(0, 5).map(a => ({
              provider: a.provider,
              model: a.model_id,
              field: a.field,
              deviation: `${(a.deviation * 100).toFixed(1)}%`
            }))
          });
        }
      }
    } catch (error: any) {
      logger.error(`Price sync error`, { error: error.message });
    }
  }

  /**
   * 手动触发完整模型同步
   */
  async runSyncModels(): Promise<void> {
    logger.info('Starting full model sync');
    const startTime = Date.now();

    try {
      const result = await syncModels();
      const duration = Date.now() - startTime;

      if (result.error) {
        logger.error(`Model sync failed`, { error: result.error, duration });
      } else {
        logger.info(
          `Model sync complete`,
          {
            modelsFound: result.modelsFound,
            modelsAdded: result.modelsAdded,
            modelsUpdated: result.modelsUpdated,
            priceChanges: result.priceChanges,
            duration
          }
        );
      }
    } catch (error: any) {
      logger.error(`Model sync error`, { error: error.message });
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { isRunning: boolean; lastSync: number | null; catalogStats: ReturnType<typeof getCatalogStats> } {
    return {
      isRunning: this.isRunning,
      lastSync: getLastSyncTime(),
      catalogStats: getCatalogStats(),
    };
  }
}

/** 全局调度器实例 */
export const modelSyncScheduler = new ModelSyncScheduler();

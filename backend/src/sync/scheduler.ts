/**
 * 模型目录定时同步调度器
 */

import { syncPrices, syncModels, importFromProviders } from './index';
import { getLastSyncTime, getCatalogStats } from '../db/model-catalog';
import { modelCapabilities } from '../config/providers';

export class ModelSyncScheduler {
  private timers: ReturnType<typeof setInterval>[] = [];
  private isRunning = false;

  /**
   * 启动定时同步
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[ModelSync] Scheduler already running');
      return;
    }

    this.isRunning = true;

    // 检查是否需要首次初始化
    const stats = getCatalogStats();
    if (stats.total === 0) {
      console.log('[ModelSync] Catalog empty, importing from providers.ts...');
      const result = importFromProviders(modelCapabilities);
      console.log(`[ModelSync] Imported: ${result.inserted} inserted, ${result.updated} updated`);
    }

    // 启动时检查是否需要同步
    const lastSync = getLastSyncTime();
    const shouldSyncNow = !lastSync || Date.now() - lastSync > 60 * 60 * 1000; // 1 小时

    if (shouldSyncNow) {
      console.log('[ModelSync] Last sync overdue, running now...');
      this.runSyncPrices().catch(err =>
        console.error('[ModelSync] Startup sync failed:', err.message)
      );
    }

    // 每 6 小时更新价格
    this.timers.push(
      setInterval(() => {
        this.runSyncPrices().catch(err =>
          console.error('[ModelSync] Price sync failed:', err.message)
        );
      }, 6 * 60 * 60 * 1000)
    );

    // 每 24 小时更新模型列表
    this.timers.push(
      setInterval(() => {
        this.runSyncModels().catch(err =>
          console.error('[ModelSync] Model sync failed:', err.message)
        );
      }, 24 * 60 * 60 * 1000)
    );

    console.log('[ModelSync] Scheduler started (prices: 6h, models: 24h)');
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
    console.log('[ModelSync] Scheduler stopped');
  }

  /**
   * 手动触发价格同步
   */
  async runSyncPrices(): Promise<void> {
    console.log('[ModelSync] Starting price sync...');
    const startTime = Date.now();

    try {
      const result = await syncPrices();
      const duration = Date.now() - startTime;

      if (result.error) {
        console.error(`[ModelSync] Price sync failed: ${result.error} (${duration}ms)`);
      } else {
        console.log(
          `[ModelSync] Price sync complete: ${result.modelsFound} found, ` +
          `${result.modelsAdded} added, ${result.modelsUpdated} updated, ` +
          `${result.priceChanges} price changes (${duration}ms)`
        );

        if (result.priceAlerts.length > 0) {
          console.warn(`[ModelSync] ${result.priceAlerts.length} price alerts:`);
          for (const alert of result.priceAlerts.slice(0, 5)) {
            console.warn(
              `  ${alert.provider}/${alert.model_id} ${alert.field}: ` +
              `ours=${alert.ourValue.toFixed(4)} ref=${alert.referenceValue.toFixed(4)} ` +
              `deviation=${(alert.deviation * 100).toFixed(1)}%`
            );
          }
        }
      }
    } catch (error: any) {
      console.error(`[ModelSync] Price sync error: ${error.message}`);
    }
  }

  /**
   * 手动触发完整模型同步
   */
  async runSyncModels(): Promise<void> {
    console.log('[ModelSync] Starting full model sync...');
    const startTime = Date.now();

    try {
      const result = await syncModels();
      const duration = Date.now() - startTime;

      if (result.error) {
        console.error(`[ModelSync] Model sync failed: ${result.error} (${duration}ms)`);
      } else {
        console.log(
          `[ModelSync] Model sync complete: ${result.modelsFound} found, ` +
          `${result.modelsAdded} added, ${result.modelsUpdated} updated, ` +
          `${result.priceChanges} price changes (${duration}ms)`
        );
      }
    } catch (error: any) {
      console.error(`[ModelSync] Model sync error: ${error.message}`);
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

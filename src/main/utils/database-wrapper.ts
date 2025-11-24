/**
 * 数据库包装器 - 为现有 DatabaseManager 提供增强功能
 * 提供向后兼容性和改进的监控能力
 */

import { DatabaseManager } from '../database/sqlite-schema';
import { RetryUtils } from './retry-utils';

export interface EnhancedDatabaseStatus {
  isAvailable: boolean;
  lastCheck: number;
  totalOperations: number;
  totalErrors: number;
  averageQueryTime: number;
  lastError?: Error;
  uptime: number;
}

export class DatabaseWrapper {
  private originalManager: DatabaseManager;
  private stats: EnhancedDatabaseStatus;
  private startTime: number;
  private operationTimes: number[] = [];
  private maxOperationTimes = 100; // 保留最近100次操作的执行时间

  constructor(databaseManager: DatabaseManager) {
    this.originalManager = databaseManager;
    this.startTime = Date.now();
    this.stats = {
      isAvailable: false,
      lastCheck: 0,
      totalOperations: 0,
      totalErrors: 0,
      averageQueryTime: 0,
      uptime: 0
    };
  }

  /**
   * 获取原始数据库实例
   */
  getDatabase(): any {
    return this.originalManager.getDatabase();
  }

  /**
   * 包装的数据库操作
   */
  async executeWithMonitoring<T = any>(
    operation: () => Promise<T>,
    operationName: string = 'database_operation'
  ): Promise<T> {
    const startTime = Date.now();
    this.stats.totalOperations++;

    try {
      const result = await operation();

      // 记录成功操作
      const executionTime = Date.now() - startTime;
      this.recordOperationTime(executionTime);
      this.stats.lastCheck = Date.now();
      this.stats.isAvailable = true;

      // 记录详细日志（可选）
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Database] ${operationName} completed in ${executionTime}ms`);
      }

      return result;

    } catch (error) {
      // 记录失败操作
      this.stats.totalErrors++;
      this.stats.lastError = error instanceof Error ? error : new Error(String(error));
      this.stats.lastCheck = Date.now();
      this.stats.isAvailable = false;

      console.error(`[Database] ${operationName} failed:`, error);
      throw error;
    }
  }

  /**
   * 包装的准备语句执行
   */
  prepare(query: string): any {
    const db = this.getDatabase();
    const statement = db.prepare(query);

    // 包装原始方法以添加监控
    const originalRun = statement.run.bind(statement);
    const originalAll = statement.all.bind(statement);
    const originalGet = statement.get.bind(statement);

    statement.run = async (...args: any[]) => {
      return await this.executeWithMonitoring(
        () => originalRun(...args),
        'prepared_run'
      );
    };

    statement.all = async (...args: any[]) => {
      return await this.executeWithMonitoring(
        () => originalAll(...args),
        'prepared_all'
      );
    };

    statement.get = async (...args: any[]) => {
      return await this.executeWithMonitoring(
        () => originalGet(...args),
        'prepared_get'
      );
    };

    return statement;
  }

  /**
   * 执行查询带重试机制
   */
  async executeWithRetry<T = any>(
    query: string,
    params: any[] = [],
    maxRetries: number = 2
  ): Promise<T> {
    const operation = async () => {
      const db = this.getDatabase();

      if (query.trim().toUpperCase().startsWith('SELECT')) {
        return await db.all(query, ...params);
      } else if (query.trim().toUpperCase().startsWith('INSERT') ||
                 query.trim().toUpperCase().startsWith('UPDATE') ||
                 query.trim().toUpperCase().startsWith('DELETE')) {
        return await db.run(query, ...params);
      } else {
        return await db.exec(query);
      }
    };

    const retryOptions = {
      ...RetryUtils.DATABASE_RETRY_OPTIONS,
      maxAttempts: maxRetries + 1,
      onRetry: (attempt, error, delay) => {
        console.warn(`[Database] Query retry ${attempt} in ${delay}ms:`, error.message);
      }
    };

    const result = await RetryUtils.executeWithRetry(operation, retryOptions);

    if (!result.success) {
      throw result.error || new Error('Query failed after retries');
    }

    return result.result as T;
  }

  /**
   * 记录操作时间
   */
  private recordOperationTime(time: number): void {
    this.operationTimes.push(time);

    // 保持数组大小在限制范围内
    if (this.operationTimes.length > this.maxOperationTimes) {
      this.operationTimes.shift();
    }

    // 计算平均执行时间
    if (this.operationTimes.length > 0) {
      const sum = this.operationTimes.reduce((acc, time) => acc + time, 0);
      this.stats.averageQueryTime = Math.round(sum / this.operationTimes.length);
    }
  }

  /**
   * 获取增强的数据库状态
   */
  getEnhancedStatus(): EnhancedDatabaseStatus {
    this.stats.uptime = Date.now() - this.startTime;
    return { ...this.stats };
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    details: EnhancedDatabaseStatus;
    canConnect: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    let canConnect = false;

    try {
      // 执行简单查询测试连接
      await this.executeWithMonitoring(async () => {
        const db = this.getDatabase();
        return await db.get('SELECT 1 as test');
      }, 'health_check');

      canConnect = true;
      this.stats.isAvailable = true;

    } catch (error) {
      canConnect = false;
      this.stats.isAvailable = false;
      this.stats.lastError = error instanceof Error ? error : new Error(String(error));
    }

    const responseTime = Date.now() - startTime;
    const status = this.getEnhancedStatus();

    return {
      healthy: canConnect && this.stats.totalErrors < this.stats.totalOperations * 0.1, // 错误率低于10%
      details: status,
      canConnect,
      responseTime
    };
  }

  /**
   * 批量执行操作
   */
  async executeBatch<T = any>(
    operations: Array<{ query: string; params?: any[]; name?: string }>,
    options: {
      continueOnError?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: Error; operation: string }>> {
    const {
      continueOnError = true,
      maxConcurrency = 3
    } = options;

    const results: Array<{ success: boolean; result?: T; error?: Error; operation: string }> = [];

    // 分批执行以避免过载
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (op) => {
        try {
          const result = await this.executeWithMonitoring(
            () => this.executeWithRetry(op.query, op.params || []),
            op.name || 'batch_operation'
          );

          return {
            success: true,
            result,
            operation: op.name || op.query
          };
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));

          if (!continueOnError) {
            throw errorObj;
          }

          return {
            success: false,
            error: errorObj,
            operation: op.name || op.query
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    totalOperations: number;
    totalErrors: number;
    errorRate: number;
    averageQueryTime: number;
    lastHourOperations: number;
    uptimeHours: number;
  } {
    const uptimeHours = (Date.now() - this.startTime) / (1000 * 60 * 60);
    const errorRate = this.stats.totalOperations > 0
      ? (this.stats.totalErrors / this.stats.totalOperations) * 100
      : 0;

    return {
      totalOperations: this.stats.totalOperations,
      totalErrors: this.stats.totalErrors,
      errorRate: Math.round(errorRate * 100) / 100,
      averageQueryTime: this.stats.averageQueryTime,
      lastHourOperations: this.stats.totalOperations, // 简化实现
      uptimeHours: Math.round(uptimeHours * 100) / 100
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.operationTimes = [];
    this.stats = {
      isAvailable: false,
      lastCheck: 0,
      totalOperations: 0,
      totalErrors: 0,
      averageQueryTime: 0,
      uptime: Date.now() - this.startTime
    };
  }
}
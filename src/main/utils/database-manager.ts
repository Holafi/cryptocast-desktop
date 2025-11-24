/**
 * 改进的数据库连接管理器
 * 提供连接池、状态监控和健康检查功能
 */

import * as sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import os from 'os';

export interface DatabaseConfig {
  path?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  busyTimeout?: number;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL';
  synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
}

export interface DatabaseStatus {
  connected: boolean;
  path: string;
  connectionCount: number;
  totalQueries: number;
  totalErrors: number;
  lastQueryTime: number;
  lastError?: Error;
  uptime: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

export interface QueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  executionTime: number;
}

export class ImprovedDatabaseManager {
  private db: Database | null = null;
  private config: Required<DatabaseConfig>;
  private status: DatabaseStatus;
  private connectionStartTime: number;
  private queryCount = 0;
  private errorCount = 0;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      path: config.path || this.getDefaultDatabasePath(),
      maxConnections: config.maxConnections || 1,
      connectionTimeout: config.connectionTimeout || 30000,
      busyTimeout: config.busyTimeout || 10000,
      enableWAL: config.enableWAL !== false,
      enableForeignKeys: config.enableForeignKeys !== false,
      journalMode: config.journalMode || (config.enableWAL !== false ? 'WAL' : 'DELETE'),
      synchronous: config.synchronous || 'NORMAL'
    };

    this.connectionStartTime = Date.now();
    this.status = {
      connected: false,
      path: this.config.path,
      connectionCount: 0,
      totalQueries: 0,
      totalErrors: 0,
      lastQueryTime: 0,
      uptime: 0
    };
  }

  /**
   * 初始化数据库连接
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[Database] Already initialized');
      return;
    }

    try {
      console.log('[Database] Initializing database connection...');

      // 确保数据库目录存在
      await this.ensureDirectoryExists(path.dirname(this.config.path));

      // 打开数据库连接
      this.db = await open({
        filename: this.config.path,
        driver: sqlite3.Database
      });

      // 配置数据库
      await this.configureDatabase();

      // 启动健康检查
      this.startHealthCheck();

      this.status.connected = true;
      this.status.connectionCount = 1;
      this.isInitialized = true;

      console.log('[Database] Database initialized successfully:', this.config.path);

    } catch (error) {
      this.status.lastError = error instanceof Error ? error : new Error(String(error));
      console.error('[Database] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * 配置数据库设置
   */
  private async configureDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queries = [
      // 设置繁忙超时
      `PRAGMA busy_timeout = ${this.config.busyTimeout}`,

      // 启用外键约束
      `PRAGMA foreign_keys = ${this.config.enableForeignKeys ? 'ON' : 'OFF'}`,

      // 设置日志模式
      `PRAGMA journal_mode = ${this.config.journalMode}`,

      // 设置同步模式
      `PRAGMA synchronous = ${this.config.synchronous}`,

      // 启用WAL模式（如果配置）
      ...(this.config.enableWAL ? [`PRAGMA wal_autocheckpoint = 1000`] : []),

      // 优化性能设置
      'PRAGMA cache_size = 10000',
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 268435456' // 256MB
    ];

    for (const query of queries) {
      await this.db.exec(query);
    }
  }

  /**
   * 执行查询带性能监控
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    this.status.lastQueryTime = startTime;

    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      let result: T;

      if (query.trim().toUpperCase().startsWith('SELECT')) {
        result = await this.db.all(query, ...params) as T;
      } else if (query.trim().toUpperCase().startsWith('INSERT') ||
                 query.trim().toUpperCase().startsWith('UPDATE') ||
                 query.trim().toUpperCase().startsWith('DELETE')) {
        result = await this.db.run(query, ...params) as T;
      } else {
        result = await this.db.exec(query) as T;
      }

      this.queryCount++;
      this.status.totalQueries = this.queryCount;

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      this.errorCount++;
      this.status.totalErrors = this.errorCount;
      this.status.lastError = error instanceof Error ? error : new Error(String(error));

      return {
        success: false,
        error: this.status.lastError,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 准备语句执行
   */
  prepare(query: string): any {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const statement = this.db.prepare(query);

    // 包装原始方法以添加监控
    const originalRun = statement.run.bind(statement);
    const originalAll = statement.all.bind(statement);
    const originalGet = statement.get.bind(statement);

    statement.run = (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = originalRun(...args);
        this.queryCount++;
        this.status.totalQueries = this.queryCount;
        return result;
      } catch (error) {
        this.errorCount++;
        this.status.totalErrors = this.errorCount;
        throw error;
      }
    };

    statement.all = (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = originalAll(...args);
        this.queryCount++;
        this.status.totalQueries = this.queryCount;
        return result;
      } catch (error) {
        this.errorCount++;
        this.status.totalErrors = this.errorCount;
        throw error;
      }
    };

    statement.get = (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = originalGet(...args);
        this.queryCount++;
        this.status.totalQueries = this.queryCount;
        return result;
      } catch (error) {
        this.errorCount++;
        this.status.totalErrors = this.errorCount;
        throw error;
      }
    };

    return statement;
  }

  /**
   * 获取数据库状态
   */
  getStatus(): DatabaseStatus {
    this.status.uptime = Date.now() - this.connectionStartTime;
    this.status.memoryUsage = process.memoryUsage();
    return { ...this.status };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; details: DatabaseStatus }> {
    try {
      // 执行简单查询测试连接
      await this.executeQuery('SELECT 1 as test');

      // 检查数据库文件是否可访问
      const stats = await this.executeQuery('PRAGMA page_count');

      return {
        healthy: true,
        details: this.getStatus()
      };
    } catch (error) {
      this.status.lastError = error instanceof Error ? error : new Error(String(error));
      return {
        healthy: false,
        details: this.getStatus()
      };
    }
  }

  /**
   * 开始健康检查定时器
   */
  private startHealthCheck(): void {
    // 每5分钟进行一次健康检查
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      if (!health.healthy) {
        console.warn('[Database] Health check failed:', health.details.lastError);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 获取数据库实例（向后兼容）
   */
  getDatabase(): Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * 获取数据库连接池统计
   */
  getPoolStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    maxConnections: number;
  } {
    return {
      totalConnections: this.status.connectionCount,
      activeConnections: 1, // 简化实现
      idleConnections: 0,
      maxConnections: this.config.maxConnections
    };
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.db) {
        await this.db.close();
        this.db = null;
      }

      this.status.connected = false;
      this.isInitialized = false;

      console.log('[Database] Database connection closed');

    } catch (error) {
      console.error('[Database] Error closing database:', error);
      throw error;
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 获取默认数据库路径
   */
  private getDefaultDatabasePath(): string {
    const userDataDir = path.join(os.homedir(), 'cryptocast');
    return path.join(userDataDir, 'cryptocast.db');
  }
}
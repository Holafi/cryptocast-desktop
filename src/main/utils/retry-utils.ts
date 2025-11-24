/**
 * 智能重试工具类
 * 实现指数退避重试策略和错误分类
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

export class RetryUtils {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'ECONNREFUSED',
      'network timeout',
      'timeout',
      'connection timeout',
      'rate limit',
      'rate limited',
      'too many requests',
      'temporary failure',
      'temporary error',
      'service unavailable',
      'gateway timeout',
      'bad gateway',
      'nonce too low',
      'gas price too low',
      'underpriced'
    ],
    nonRetryableErrors: [
      'insufficient funds',
      'invalid address',
      'invalid signature',
      'unauthorized',
      'forbidden',
      'not found',
      'invalid contract',
      'contract execution reverted',
      'out of gas',
      'gas required exceeds allowance'
    ],
    onRetry: () => {}
  };

  /**
   * 执行带重试的异步操作
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error | undefined;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelay
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否为不可重试的错误
        if (this.isNonRetryableError(lastError, config)) {
          break;
        }

        // 如果是最后一次尝试，不再重试
        if (attempt === config.maxAttempts) {
          break;
        }

        // 计算延迟时间
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        // 添加随机抖动以避免雷群效应
        const jitter = delay * 0.1 * Math.random();
        const finalDelay = delay + jitter;

        totalDelay += finalDelay;

        // 调用回调函数
        try {
          config.onRetry(attempt, lastError, Math.round(finalDelay));
        } catch (callbackError) {
          console.warn('Retry callback failed:', callbackError);
        }

        // 等待后重试
        await this.sleep(finalDelay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDelay
    };
  }

  /**
   * 批量操作重试
   */
  static async executeBatchWithRetry<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    options: RetryOptions = {}
  ): Promise<Array<{ item: T; result: RetryResult<R> }>> {
    const results: Array<{ item: T; result: RetryResult<R> }> = [];

    for (const item of items) {
      const result = await this.executeWithRetry(() => operation(item), options);
      results.push({ item, result });
    }

    return results;
  }

  /**
   * 判断错误是否为可重试错误
   */
  private static isRetryableError(error: Error, config: Required<RetryOptions>): boolean {
    const errorMessage = error.message.toLowerCase();

    // 检查是否匹配可重试错误
    return config.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  /**
   * 判断错误是否为不可重试错误
   */
  private static isNonRetryableError(error: Error, config: Required<RetryOptions>): boolean {
    const errorMessage = error.message.toLowerCase();

    // 检查是否匹配不可重试错误
    return config.nonRetryableErrors.some(nonRetryableError =>
      errorMessage.includes(nonRetryableError.toLowerCase())
    );
  }

  /**
   * 异步睡眠
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 针对区块链操作的重试配置
   */
  static readonly BLOCKCHAIN_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 1.5,
    retryableErrors: [
      'network timeout',
      'timeout',
      'connection timeout',
      'rate limit',
      'rate limited',
      'too many requests',
      'temporary failure',
      'service unavailable',
      'gateway timeout',
      'bad gateway',
      'nonce too low',
      'gas price too low',
      'underpriced',
      'transaction underpriced'
    ],
    nonRetryableErrors: [
      'insufficient funds',
      'invalid address',
      'invalid signature',
      'unauthorized',
      'forbidden',
      'not found',
      'invalid contract',
      'contract execution reverted',
      'out of gas',
      'gas required exceeds allowance',
      'invalid recipient'
    ],
    onRetry: (attempt, error, delay) => {
      console.warn(`[Blockchain Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
    }
  };

  /**
   * 针对网络请求的重试配置
   */
  static readonly NETWORK_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'ECONNREFUSED',
      'network timeout',
      'timeout',
      'connection timeout',
      'rate limit',
      'rate limited',
      'too many requests',
      'service unavailable',
      'gateway timeout',
      'bad gateway'
    ],
    nonRetryableErrors: [
      '404',
      '401',
      '403',
      '400',
      '405',
      '422'
    ],
    onRetry: (attempt, error, delay) => {
      console.warn(`[Network Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
    }
  };

  /**
   * 针对数据库操作的重试配置
   */
  static readonly DATABASE_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    retryableErrors: [
      'database is locked',
      'busy',
      'timeout'
    ],
    nonRetryableErrors: [
      'no such table',
      'syntax error',
      'constraint failed',
      'foreign key constraint'
    ],
    onRetry: (attempt, error, delay) => {
      console.warn(`[Database Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
    }
  };
}
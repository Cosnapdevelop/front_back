import { BaseError, ErrorCode, ErrorSeverity } from '../types/errors';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed' | 'jitter';
  retryableErrors: string[];
  retryableStatuses: number[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  onMaxAttempts?: (error: Error) => void;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  timeout?: number;
}

export interface RetryStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  totalRetries: number;
  averageAttempts: number;
  lastRetryTime: number;
}

export class RetryableError extends BaseError {
  constructor(
    message: string,
    public originalError: Error,
    public attempt: number,
    public maxAttempts: number
  ) {
    super(message, ErrorCode.UNKNOWN_ERROR, ErrorSeverity.MEDIUM, true);
    this.name = 'RetryableError';
  }
}

export class MaxRetriesExceededError extends BaseError {
  constructor(
    public originalError: Error,
    public attempts: number,
    public maxAttempts: number
  ) {
    super(
      `Max retries (${maxAttempts}) exceeded after ${attempts} attempts. Last error: ${originalError.message}`,
      ErrorCode.UNKNOWN_ERROR,
      ErrorSeverity.HIGH,
      false
    );
    this.name = 'MaxRetriesExceededError';
  }
}

export class RetryManager {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    totalRetries: 0,
    averageAttempts: 0,
    lastRetryTime: 0
  };
  
  private retryConfigs = new Map<string, RetryConfig>();
  
  constructor() {
    this.initializeDefaultConfigs();
  }
  
  private initializeDefaultConfigs(): void {
    // API calls configuration
    this.retryConfigs.set('api_call', {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      backoffStrategy: 'exponential',
      retryableErrors: ['NetworkError', 'TimeoutError', 'FetchError', 'AbortError'],
      retryableStatuses: [408, 429, 500, 502, 503, 504],
      timeout: 30000
    });
    
    // File upload configuration
    this.retryConfigs.set('file_upload', {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
      backoffStrategy: 'exponential',
      retryableErrors: ['NetworkError', 'UploadError', 'TimeoutError'],
      retryableStatuses: [413, 429, 500, 502, 503, 504],
      timeout: 120000
    });
    
    // AI processing configuration
    this.retryConfigs.set('ai_processing', {
      maxAttempts: 2,
      baseDelay: 5000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      backoffStrategy: 'exponential',
      retryableErrors: ['ProcessingTimeout', 'ServiceUnavailable', 'NetworkError'],
      retryableStatuses: [429, 500, 502, 503, 504],
      timeout: 180000
    });
    
    // Authentication configuration
    this.retryConfigs.set('authentication', {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      backoffStrategy: 'fixed',
      retryableErrors: ['NetworkError', 'TimeoutError'],
      retryableStatuses: [429, 500, 502, 503, 504],
      timeout: 15000
    });
    
    // Payment processing configuration
    this.retryConfigs.set('payment', {
      maxAttempts: 1, // No retries for payment to avoid double charges
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      backoffStrategy: 'fixed',
      retryableErrors: [],
      retryableStatuses: [],
      timeout: 30000
    });
    
    // Database operations configuration
    this.retryConfigs.set('database', {
      maxAttempts: 3,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
      backoffStrategy: 'jitter',
      retryableErrors: ['DatabaseConnectionError', 'TimeoutError'],
      retryableStatuses: [500, 503, 504],
      timeout: 10000
    });
  }
  
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = this.getConfig(operationType, customConfig);
    let lastError: Error;
    let attempt = 0;
    
    while (attempt < config.maxAttempts) {
      attempt++;
      this.stats.totalAttempts++;
      
      try {
        // Execute with timeout if specified
        const result = config.timeout 
          ? await this.executeWithTimeout(operation, config.timeout)
          : await operation();
          
        this.stats.successfulAttempts++;
        this.updateAverageAttempts(attempt);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.stats.failedAttempts++;
        
        // Check if we should retry
        if (attempt >= config.maxAttempts || !this.shouldRetry(lastError, attempt, config)) {
          break;
        }
        
        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, config);
        this.stats.totalRetries++;
        this.stats.lastRetryTime = Date.now();
        
        // Notify about retry
        config.onRetry?.(attempt, lastError, delay);
        
        console.warn(`[RetryManager] Attempt ${attempt}/${config.maxAttempts} failed for ${operationType}. Retrying in ${delay}ms. Error: ${lastError.message}`);
        
        await this.sleep(delay);
      }
    }
    
    // Max attempts reached
    config.onMaxAttempts?.(lastError!);
    throw new MaxRetriesExceededError(lastError!, attempt, config.maxAttempts);
  }
  
  private getConfig(operationType: string, customConfig?: Partial<RetryConfig>): RetryConfig {
    const baseConfig = this.retryConfigs.get(operationType);
    if (!baseConfig) {
      throw new Error(`No retry configuration found for operation type: ${operationType}`);
    }
    
    return { ...baseConfig, ...customConfig };
  }
  
  private shouldRetry(error: Error, attempt: number, config: RetryConfig): boolean {
    // Use custom retry logic if provided
    if (config.shouldRetry) {
      return config.shouldRetry(error, attempt);
    }
    
    // Check if error is retryable
    return this.isRetryableError(error, config);
  }
  
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    // Check error patterns
    const errorString = `${error.name} ${error.message}`.toLowerCase();
    const isRetryableByPattern = config.retryableErrors.some(pattern => 
      errorString.includes(pattern.toLowerCase())
    );
    
    // Check HTTP status codes
    const status = this.extractStatusCode(error);
    const isRetryableByStatus = status ? config.retryableStatuses.includes(status) : false;
    
    // Check if it's our custom retryable error
    const isCustomRetryable = error instanceof BaseError && error.retryable;
    
    return isRetryableByPattern || isRetryableByStatus || isCustomRetryable;
  }
  
  private extractStatusCode(error: Error): number | null {
    // Try to extract status code from error object
    if ((error as any).status) {
      return (error as any).status;
    }
    
    if ((error as any).response?.status) {
      return (error as any).response.status;
    }
    
    // Try to extract from error message
    const statusMatch = error.message.match(/(\d{3})/);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }
    
    return null;
  }
  
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;
    
    switch (config.backoffStrategy) {
      case 'exponential':
        delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        break;
        
      case 'linear':
        delay = config.baseDelay * attempt;
        break;
        
      case 'jitter':
        // Exponential backoff with jitter to avoid thundering herd
        const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        const jitter = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
        delay = exponentialDelay * jitter;
        break;
        
      case 'fixed':
      default:
        delay = config.baseDelay;
        break;
    }
    
    return Math.min(delay, config.maxDelay);
  }
  
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
      
      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private updateAverageAttempts(attempts: number): void {
    const totalOperations = this.stats.successfulAttempts + this.stats.failedAttempts;
    
    // Prevent division by zero - if no operations yet, set to current attempts
    if (totalOperations > 0) {
      this.stats.averageAttempts = (this.stats.averageAttempts * (totalOperations - 1) + attempts) / totalOperations;
    } else {
      this.stats.averageAttempts = attempts;
    }
  }
  
  // Configuration management methods
  public setConfig(operationType: string, config: RetryConfig): void {
    this.retryConfigs.set(operationType, config);
  }
  
  public getConfigForType(operationType: string): RetryConfig | undefined {
    return this.retryConfigs.get(operationType);
  }
  
  public updateConfig(operationType: string, updates: Partial<RetryConfig>): void {
    const existing = this.retryConfigs.get(operationType);
    if (existing) {
      this.retryConfigs.set(operationType, { ...existing, ...updates });
    }
  }
  
  public removeConfig(operationType: string): boolean {
    return this.retryConfigs.delete(operationType);
  }
  
  // Statistics and monitoring
  public getStats(): RetryStats {
    return { ...this.stats };
  }
  
  public resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      totalRetries: 0,
      averageAttempts: 0,
      lastRetryTime: 0
    };
  }
  
  public getSuccessRate(): number {
    const totalOperations = this.stats.successfulAttempts + this.stats.failedAttempts;
    return totalOperations > 0 ? this.stats.successfulAttempts / totalOperations : 0;
  }
  
  public getRetryRate(): number {
    return this.stats.totalAttempts > 0 ? this.stats.totalRetries / this.stats.totalAttempts : 0;
  }
  
  // Utility methods for common patterns
  public async retryFetch(url: string, options?: RequestInit, config?: Partial<RetryConfig>): Promise<Response> {
    return this.executeWithRetry(
      async () => {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
      },
      'api_call',
      config
    );
  }
  
  public async retryAsyncOperation<T>(
    operation: () => Promise<T>,
    operationType: string = 'default',
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    return this.executeWithRetry(
      operation,
      operationType,
      { maxAttempts, baseDelay }
    );
  }
  
  // Create a retryable version of any async function
  public createRetryableFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationType: string,
    config?: Partial<RetryConfig>
  ): T {
    return ((...args: Parameters<T>) => {
      return this.executeWithRetry(
        () => fn(...args),
        operationType,
        config
      );
    }) as T;
  }
}

// Create and export singleton instance
export const retryManager = new RetryManager();

// Export convenience functions
export function createRetryConfig(overrides: Partial<RetryConfig>): RetryConfig {
  const defaults: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    backoffStrategy: 'exponential',
    retryableErrors: ['NetworkError', 'TimeoutError'],
    retryableStatuses: [429, 500, 502, 503, 504]
  };
  
  return { ...defaults, ...overrides };
}

export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return retryManager.createRetryableFunction(fn, 'custom', config);
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  return retryManager.retryAsyncOperation(operation, 'adhoc', maxAttempts, baseDelay);
}

export default retryManager;
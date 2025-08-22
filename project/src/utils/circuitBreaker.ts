import { BaseError, ErrorCode, ErrorSeverity } from '../types/errors';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  halfOpenMaxCalls: number;
  fallbackStrategy?: 'queue' | 'cache' | 'reject' | 'custom';
  fallbackHandler?: () => Promise<any>;
  retryableErrors?: string[];
  onStateChange?: (state: CircuitState, error?: Error) => void;
  onFallback?: (error: Error) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  halfOpenCalls: number;
  uptime: number;
}

export class CircuitBreakerError extends BaseError {
  constructor(message: string, public originalError?: Error) {
    super(message, ErrorCode.API_ERROR, ErrorSeverity.HIGH, false);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private totalCalls: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private halfOpenCalls: number = 0;
  private stateChangeListeners: Array<(state: CircuitState) => void> = [];
  private startTime: number = Date.now();
  private windowStart: number = Date.now();
  private windowFailures: number = 0;
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {
    // Set default retryable errors if not provided
    if (!this.config.retryableErrors) {
      this.config.retryableErrors = [
        'NetworkError',
        'TimeoutError',
        'FetchError',
        '500',
        '502',
        '503',
        '504',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND'
      ];
    }
  }
  
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalCalls++;
    
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (this.shouldTryReset()) {
        this.setState(CircuitState.HALF_OPEN);
        this.halfOpenCalls = 0;
      } else {
        return this.handleOpenCircuit();
      }
    }
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        return this.handleOpenCircuit();
      }
      this.halfOpenCalls++;
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Reset after successful half-open call
      this.setState(CircuitState.CLOSED);
      this.resetCounts();
    }
  }
  
  private onFailure(error: any): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    // Check if error is retryable
    if (!this.isRetryableError(error)) {
      return; // Don't count non-retryable errors towards circuit breaking
    }
    
    // Update window-based failure tracking
    this.updateFailureWindow();
    this.windowFailures++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN);
    } else if (this.windowFailures >= this.config.failureThreshold) {
      this.setState(CircuitState.OPEN);
    }
  }
  
  private updateFailureWindow(): void {
    const now = Date.now();
    if (now - this.windowStart > this.config.monitoringWindow) {
      this.windowStart = now;
      this.windowFailures = 0;
    }
  }
  
  private isRetryableError(error: any): boolean {
    if (!this.config.retryableErrors) return true;
    
    const errorString = this.getErrorString(error);
    return this.config.retryableErrors.some(pattern => 
      errorString.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  private getErrorString(error: any): string {
    if (error instanceof Error) {
      return `${error.name} ${error.message}`;
    }
    
    if (typeof error === 'object' && error !== null) {
      if (error.status) return String(error.status);
      if (error.code) return String(error.code);
      if (error.message) return String(error.message);
    }
    
    return String(error);
  }
  
  private shouldTryReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }
  
  private setState(newState: CircuitState): void {
    if (this.state !== newState) {
      const previousState = this.state;
      this.state = newState;
      
      console.log(`[CircuitBreaker:${this.name}] State changed: ${previousState} -> ${newState}`);
      
      this.config.onStateChange?.(newState);
      this.stateChangeListeners.forEach(listener => listener(newState));
    }
  }
  
  private resetCounts(): void {
    this.failures = 0;
    this.windowFailures = 0;
    this.windowStart = Date.now();
  }
  
  private async handleOpenCircuit<T>(): Promise<T> {
    const error = new CircuitBreakerError(
      `Circuit breaker '${this.name}' is open - service unavailable`
    );
    
    // Try fallback strategy
    if (this.config.fallbackStrategy) {
      try {
        return await this.executeFallback();
      } catch (fallbackError) {
        this.config.onFallback?.(fallbackError);
        throw new CircuitBreakerError(
          `Circuit breaker open and fallback failed: ${fallbackError.message}`,
          fallbackError
        );
      }
    }
    
    throw error;
  }
  
  private async executeFallback<T>(): Promise<T> {
    switch (this.config.fallbackStrategy) {
      case 'custom':
        if (this.config.fallbackHandler) {
          return await this.config.fallbackHandler();
        }
        throw new Error('Custom fallback handler not provided');
        
      case 'cache':
        return this.getCachedResponse();
        
      case 'queue':
        return this.queueRequest();
        
      case 'reject':
      default:
        throw new Error('Service unavailable - circuit breaker open');
    }
  }
  
  private getCachedResponse<T>(): T {
    // Try to get cached response with LocalStorage error handling
    try {
      const cacheKey = `circuit_breaker_cache_${this.name}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.warn(`[CircuitBreaker:${this.name}] Failed to parse cached response`);
        }
      }
    } catch (storageError) {
      console.warn(`[CircuitBreaker:${this.name}] LocalStorage unavailable:`, storageError.message);
    }
    
    throw new Error('No cached response available');
  }
  
  private queueRequest<T>(): T {
    // Queue request for later processing with LocalStorage error handling
    try {
      const queueKey = `circuit_breaker_queue_${this.name}`;
      const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      
      const queuedRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryAt: Date.now() + this.config.recoveryTimeout
      };
      
      queue.push(queuedRequest);
      localStorage.setItem(queueKey, JSON.stringify(queue));
      
      return {
        success: false,
        queued: true,
        requestId: queuedRequest.id,
        message: 'Request queued - will retry when service is available',
        retryAt: new Date(queuedRequest.retryAt).toISOString()
      } as any;
    } catch (storageError) {
      console.warn(`[CircuitBreaker:${this.name}] LocalStorage queue unavailable:`, storageError.message);
      
      // Fallback without persistence
      return {
        success: false,
        queued: false,
        message: 'Service unavailable - please try again later',
        error: 'Storage unavailable'
      } as any;
    }
  }
  
  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      halfOpenCalls: this.halfOpenCalls,
      uptime: Date.now() - this.startTime
    };
  }
  
  public reset(): void {
    this.setState(CircuitState.CLOSED);
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.windowFailures = 0;
    this.windowStart = Date.now();
    console.log(`[CircuitBreaker:${this.name}] Reset to CLOSED state`);
  }
  
  public forceOpen(): void {
    this.setState(CircuitState.OPEN);
    console.log(`[CircuitBreaker:${this.name}] Forced to OPEN state`);
  }
  
  public forceClose(): void {
    this.setState(CircuitState.CLOSED);
    this.resetCounts();
    console.log(`[CircuitBreaker:${this.name}] Forced to CLOSED state`);
  }
  
  public onStateChange(listener: (state: CircuitState) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }
  
  public getCurrentState(): CircuitState {
    return this.state;
  }
  
  public isAvailable(): boolean {
    return this.state === CircuitState.CLOSED || 
           (this.state === CircuitState.HALF_OPEN && this.halfOpenCalls < this.config.halfOpenMaxCalls);
  }
}

// Circuit breaker registry for managing multiple instances
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  public register(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    const breaker = new CircuitBreaker(name, config);
    this.breakers.set(name, breaker);
    return breaker;
  }
  
  public get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }
  
  public getOrCreate(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = this.register(name, config);
    }
    return breaker;
  }
  
  public getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }
  
  public getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }
  
  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
  
  public remove(name: string): boolean {
    return this.breakers.delete(name);
  }
  
  public clear(): void {
    this.breakers.clear();
  }
}

// Export singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Predefined circuit breaker configurations for common services
export const CIRCUIT_BREAKER_CONFIGS = {
  runninghub_api: {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
    halfOpenMaxCalls: 3,
    fallbackStrategy: 'queue' as const,
    retryableErrors: ['NetworkError', 'TimeoutError', '502', '503', '504', 'ETIMEDOUT']
  },
  
  database: {
    failureThreshold: 3,
    recoveryTimeout: 10000, // 10 seconds
    monitoringWindow: 30000, // 30 seconds
    halfOpenMaxCalls: 2,
    fallbackStrategy: 'cache' as const,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '500', '503']
  },
  
  payment_gateway: {
    failureThreshold: 2,
    recoveryTimeout: 60000, // 1 minute
    monitoringWindow: 120000, // 2 minutes
    halfOpenMaxCalls: 1,
    fallbackStrategy: 'reject' as const,
    retryableErrors: ['NetworkError', 'TimeoutError', '502', '503', '504']
  },
  
  email_service: {
    failureThreshold: 10,
    recoveryTimeout: 120000, // 2 minutes
    monitoringWindow: 300000, // 5 minutes
    halfOpenMaxCalls: 5,
    fallbackStrategy: 'queue' as const,
    retryableErrors: ['NetworkError', 'TimeoutError', '429', '502', '503', '504']
  },
  
  file_upload: {
    failureThreshold: 3,
    recoveryTimeout: 15000, // 15 seconds
    monitoringWindow: 60000, // 1 minute
    halfOpenMaxCalls: 2,
    fallbackStrategy: 'queue' as const,
    retryableErrors: ['NetworkError', 'TimeoutError', '413', '502', '503', '504']
  }
};

// Helper function to create preconfigured circuit breakers
export function createCircuitBreaker(serviceName: keyof typeof CIRCUIT_BREAKER_CONFIGS, customConfig?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  const baseConfig = CIRCUIT_BREAKER_CONFIGS[serviceName];
  const config = { ...baseConfig, ...customConfig };
  
  return circuitBreakerRegistry.getOrCreate(serviceName, config);
}

// Circuit breaker wrapper for fetch API
export function createCircuitBreakerFetch(serviceName: string, config: CircuitBreakerConfig) {
  const breaker = circuitBreakerRegistry.getOrCreate(`fetch_${serviceName}`, config);
  
  return async function circuitBreakerFetch(url: string, options?: RequestInit): Promise<Response> {
    return breaker.execute(async () => {
      const response = await fetch(url, options);
      
      // Consider HTTP error status as failures
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    });
  };
}

// Export types and main classes
export { CircuitBreaker, CircuitBreakerRegistry };
export default CircuitBreaker;
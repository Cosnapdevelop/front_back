/**
 * Enhanced Transaction Handler for Database Operations
 * 
 * Provides robust transaction management with:
 * - Automatic retry logic for transient failures
 * - Timeout handling with graceful degradation
 * - Error classification and recovery strategies
 * - Performance monitoring and alerting
 * - Deadlock detection and resolution
 */

import { databaseManager } from '../config/prisma.js';

/**
 * Transaction execution wrapper with advanced error handling
 */
export class TransactionHandler {
  constructor() {
    this.defaultOptions = {
      maxRetries: 3,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 10000,  // 10 seconds
      timeout: 30000,        // 30 seconds
      isolationLevel: 'ReadCommitted'
    };
    
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retriedTransactions: 0,
      timeouts: 0,
      deadlocks: 0
    };
  }

  /**
   * Execute transaction with comprehensive error handling and monitoring
   */
  async execute(operations, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    const transactionId = this.generateTransactionId();
    
    this.metrics.totalTransactions++;
    
    console.log(`🔄 Starting transaction ${transactionId}`, {
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      isolationLevel: config.isolationLevel
    });

    let lastError;
    let attempt = 0;

    while (attempt < config.maxRetries) {
      attempt++;
      const startTime = Date.now();

      try {
        // Wrap operations with timeout handling
        const result = await this.executeWithTimeout(operations, config, transactionId);
        
        const duration = Date.now() - startTime;
        this.metrics.successfulTransactions++;
        
        if (attempt > 1) {
          this.metrics.retriedTransactions++;
          console.log(`✅ Transaction ${transactionId} succeeded on attempt ${attempt} (${duration}ms)`);
        } else {
          console.log(`✅ Transaction ${transactionId} completed successfully (${duration}ms)`);
        }

        // Record success metrics
        this.recordTransactionMetrics('success', duration, attempt, transactionId);
        
        return result;

      } catch (error) {
        lastError = error;
        const duration = Date.now() - startTime;
        
        // Classify error type
        const errorType = this.classifyError(error);
        console.warn(`⚠️  Transaction ${transactionId} attempt ${attempt} failed:`, {
          error: error.message,
          code: error.code,
          type: errorType,
          duration: `${duration}ms`
        });

        // Handle specific error types
        await this.handleErrorType(error, errorType, transactionId);
        
        // Check if we should retry
        if (!this.shouldRetry(error, attempt, config.maxRetries)) {
          break;
        }

        // Calculate retry delay with exponential backoff + jitter
        const retryDelay = Math.min(
          config.baseRetryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
          config.maxRetryDelay
        );

        console.log(`🔄 Retrying transaction ${transactionId} in ${retryDelay}ms (attempt ${attempt + 1}/${config.maxRetries})`);
        await this.delay(retryDelay);
      }
    }

    // All retries exhausted
    this.metrics.failedTransactions++;
    const finalError = new TransactionFailureError(
      `Transaction ${transactionId} failed after ${attempt} attempts`,
      lastError,
      {
        transactionId,
        attempts: attempt,
        maxRetries: config.maxRetries,
        originalError: lastError
      }
    );

    console.error(`❌ Transaction ${transactionId} permanently failed:`, finalError.message);
    this.recordTransactionMetrics('failure', 0, attempt, transactionId, lastError);
    
    throw finalError;
  }

  /**
   * Execute transaction with timeout wrapper
   */
  async executeWithTimeout(operations, config, transactionId) {
    const prisma = databaseManager.getInstance();
    
    return Promise.race([
      // Main transaction
      prisma.$transaction(operations, {
        maxWait: 5000, // 5 seconds to acquire transaction
        timeout: config.timeout,
        isolationLevel: config.isolationLevel
      }),
      
      // Timeout handler
      new Promise((_, reject) => {
        setTimeout(() => {
          this.metrics.timeouts++;
          reject(new TransactionTimeoutError(
            `Transaction ${transactionId} timed out after ${config.timeout}ms`,
            { transactionId, timeout: config.timeout }
          ));
        }, config.timeout + 1000); // Give extra 1s buffer
      })
    ]);
  }

  /**
   * Classify error types for appropriate handling
   */
  classifyError(error) {
    // Prisma error codes
    const prismaErrors = {
      'P2002': 'unique_constraint_violation',
      'P2003': 'foreign_key_constraint_violation', 
      'P2025': 'record_not_found',
      'P2034': 'transaction_conflict',
      'P2024': 'timeout',
      'P2028': 'transaction_api_error'
    };

    // PostgreSQL error codes
    const postgresErrors = {
      '40001': 'serialization_failure',
      '40P01': 'deadlock_detected',
      '53300': 'too_many_connections',
      '57P01': 'admin_shutdown',
      '08003': 'connection_does_not_exist',
      '08006': 'connection_failure',
      '08001': 'unable_to_connect',
      '23505': 'unique_violation',
      '23503': 'foreign_key_violation'
    };

    if (error instanceof TransactionTimeoutError) {
      return 'timeout';
    }

    const code = error.code;
    return prismaErrors[code] || postgresErrors[code] || 'unknown_error';
  }

  /**
   * Handle specific error types with appropriate actions
   */
  async handleErrorType(error, errorType, transactionId) {
    switch (errorType) {
      case 'deadlock_detected':
        this.metrics.deadlocks++;
        console.warn(`🔒 Deadlock detected in transaction ${transactionId}`, {
          code: error.code,
          hint: 'This is usually retryable'
        });
        break;

      case 'timeout':
        this.metrics.timeouts++;
        console.error(`⏰ Transaction ${transactionId} timed out`, {
          suggestion: 'Consider breaking down large operations or increasing timeout'
        });
        break;

      case 'too_many_connections':
        console.error(`🚫 Database connection limit reached for transaction ${transactionId}`, {
          suggestion: 'Check connection pool configuration or concurrent usage'
        });
        
        // Alert monitoring service
        if (global.monitoringService) {
          global.monitoringService.error('Database connection limit reached', error);
        }
        break;

      case 'connection_failure':
      case 'connection_does_not_exist':
      case 'unable_to_connect':
        console.error(`🔌 Database connection issue in transaction ${transactionId}`, {
          error: error.message,
          suggestion: 'Check database server health'
        });
        break;

      case 'unique_constraint_violation':
      case 'unique_violation':
        console.warn(`🚨 Unique constraint violation in transaction ${transactionId}`, {
          code: error.code,
          meta: error.meta
        });
        break;

      case 'foreign_key_constraint_violation':
      case 'foreign_key_violation':
        console.warn(`🔗 Foreign key constraint violation in transaction ${transactionId}`, {
          code: error.code,
          meta: error.meta
        });
        break;

      default:
        console.warn(`❓ Unclassified error in transaction ${transactionId}:`, error.message);
    }
  }

  /**
   * Determine if transaction should be retried based on error type
   */
  shouldRetry(error, currentAttempt, maxRetries) {
    if (currentAttempt >= maxRetries) {
      return false;
    }

    const errorType = this.classifyError(error);
    
    // Retryable error types
    const retryableTypes = [
      'serialization_failure',
      'deadlock_detected', 
      'transaction_conflict',
      'connection_failure',
      'connection_does_not_exist',
      'unable_to_connect',
      'admin_shutdown',
      'timeout'
    ];

    // Non-retryable error types (data/logic errors)
    const nonRetryableTypes = [
      'unique_constraint_violation',
      'foreign_key_constraint_violation',
      'record_not_found',
      'unique_violation',
      'foreign_key_violation'
    ];

    if (nonRetryableTypes.includes(errorType)) {
      console.log(`🚫 Not retrying transaction due to non-retryable error: ${errorType}`);
      return false;
    }

    if (retryableTypes.includes(errorType)) {
      console.log(`🔄 Retrying transaction due to retryable error: ${errorType}`);
      return true;
    }

    // For unknown errors, be conservative and don't retry
    console.log(`❓ Unknown error type ${errorType}, not retrying to avoid potential data corruption`);
    return false;
  }

  /**
   * Record transaction metrics for monitoring
   */
  recordTransactionMetrics(status, duration, attempts, transactionId, error = null) {
    const metrics = {
      transaction_id: transactionId,
      status,
      duration_ms: duration,
      attempts,
      timestamp: new Date().toISOString()
    };

    if (error) {
      metrics.error_code = error.code;
      metrics.error_type = this.classifyError(error);
    }

    // Send to monitoring service if available
    if (global.monitoringService) {
      global.monitoringService.recordHistogram('database_transaction_duration_seconds', {
        status,
        attempts: attempts.toString()
      }, duration / 1000);

      global.monitoringService.incrementCounter('database_transactions_total', {
        status,
        error_type: error ? this.classifyError(error) : 'none'
      });

      if (attempts > 1) {
        global.monitoringService.incrementCounter('database_transaction_retries_total', {
          final_status: status
        });
      }
    }

    console.log(`📊 Transaction metrics recorded:`, metrics);
  }

  /**
   * Get transaction handler metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalTransactions > 0 
        ? ((this.metrics.successfulTransactions / this.metrics.totalTransactions) * 100).toFixed(2)
        : '0.00',
      retryRate: this.metrics.totalTransactions > 0
        ? ((this.metrics.retriedTransactions / this.metrics.totalTransactions) * 100).toFixed(2) 
        : '0.00',
      timeoutRate: this.metrics.totalTransactions > 0
        ? ((this.metrics.timeouts / this.metrics.totalTransactions) * 100).toFixed(2)
        : '0.00'
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retriedTransactions: 0,
      timeouts: 0,
      deadlocks: 0
    };
    console.log('📊 Transaction metrics reset');
  }

  /**
   * Generate unique transaction ID for tracking
   */
  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Custom error classes for better error handling
 */
export class TransactionFailureError extends Error {
  constructor(message, originalError, metadata = {}) {
    super(message);
    this.name = 'TransactionFailureError';
    this.originalError = originalError;
    this.metadata = metadata;
  }
}

export class TransactionTimeoutError extends Error {
  constructor(message, metadata = {}) {
    super(message);
    this.name = 'TransactionTimeoutError';
    this.metadata = metadata;
  }
}

/**
 * Pre-configured transaction handlers for common scenarios
 */
export class TransactionPresets {
  static createAccountDeletionHandler() {
    return new TransactionHandler();
  }

  static createPaymentHandler() {
    return new TransactionHandler();
  }

  static createBulkOperationHandler() {
    const handler = new TransactionHandler();
    handler.defaultOptions.timeout = 60000; // 1 minute for bulk operations
    handler.defaultOptions.maxRetries = 5;
    return handler;
  }

  static createQuickOperationHandler() {
    const handler = new TransactionHandler();
    handler.defaultOptions.timeout = 10000; // 10 seconds for quick operations
    handler.defaultOptions.maxRetries = 2;
    return handler;
  }
}

// Export singleton instance for convenience
export const transactionHandler = new TransactionHandler();

// Global access for monitoring
if (typeof global !== 'undefined') {
  global.transactionHandler = transactionHandler;
}
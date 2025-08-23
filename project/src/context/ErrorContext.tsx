import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { asyncErrorHandler } from '../utils/asyncErrorHandler';
import { circuitBreakerRegistry, CIRCUIT_BREAKER_CONFIGS } from '../utils/circuitBreaker';
import { retryManager } from '../utils/retryManager';
import { BaseError, ErrorCode, ErrorSeverity, errorUtils } from '../types/errors';

interface ErrorContextState {
  // Error statistics
  totalErrors: number;
  recentErrors: ErrorSummary[];
  errorsByType: Record<string, number>;
  
  // System health
  systemHealth: 'healthy' | 'degraded' | 'critical';
  circuitBreakerStates: Record<string, string>;
  lastHealthCheck: number;
  
  // User preferences
  errorNotificationsEnabled: boolean;
  debugMode: boolean;
}

interface ErrorSummary {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  severity: ErrorSeverity;
  component?: string;
  feature?: string;
  resolved: boolean;
}

interface ErrorContextValue {
  state: ErrorContextState;
  
  // Error reporting methods
  reportError: (error: Error, context?: Partial<ErrorContext>) => string;
  reportWarning: (message: string, context?: Partial<ErrorContext>) => void;
  reportInfo: (message: string, context?: Partial<ErrorContext>) => void;
  
  // Error recovery methods
  retryLastOperation: () => Promise<void>;
  clearErrorHistory: () => void;
  markErrorResolved: (errorId: string) => void;
  
  // System health methods
  checkSystemHealth: () => Promise<void>;
  getCircuitBreakerStatus: (serviceName: string) => string;
  resetCircuitBreaker: (serviceName: string) => void;
  
  // User preferences
  toggleErrorNotifications: () => void;
  toggleDebugMode: () => void;
  
  // Utility methods
  createRetryableFunction: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationType: string
  ) => T;
  executeWithCircuitBreaker: <T>(
    serviceName: string,
    operation: () => Promise<T>
  ) => Promise<T>;
}

interface ErrorContext {
  component?: string;
  feature?: string;
  userAction?: string;
  metadata?: Record<string, any>;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
  enableCircuitBreakers?: boolean;
  enableRetryManager?: boolean;
  enableAsyncErrorHandling?: boolean;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({
  children,
  enableCircuitBreakers = true,
  enableRetryManager = true,
  enableAsyncErrorHandling = true
}) => {
  const toast = useToast();
  
  const [state, setState] = useState<ErrorContextState>({
    totalErrors: 0,
    recentErrors: [],
    errorsByType: {},
    systemHealth: 'healthy',
    circuitBreakerStates: {},
    lastHealthCheck: Date.now(),
    errorNotificationsEnabled: true,
    debugMode: process.env.NODE_ENV === 'development'
  });
  
  const [lastOperation, setLastOperation] = useState<{
    operation: () => Promise<any>;
    context: string;
  } | null>(null);
  
  useEffect(() => {
    initializeErrorHandling();
    
    // Health check interval
    const healthCheckInterval = setInterval(checkSystemHealth, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(healthCheckInterval);
      asyncErrorHandler.destroy();
    };
  }, []);
  
  const initializeErrorHandling = () => {
    // Initialize async error handler
    if (enableAsyncErrorHandling) {
      asyncErrorHandler.init(toast);
    }
    
    // Initialize circuit breakers
    if (enableCircuitBreakers) {
      Object.entries(CIRCUIT_BREAKER_CONFIGS).forEach(([name, config]) => {
        const breaker = circuitBreakerRegistry.getOrCreate(name, {
          ...config,
          onStateChange: (state) => {
            setState(prev => ({
              ...prev,
              circuitBreakerStates: {
                ...prev.circuitBreakerStates,
                [name]: state
              }
            }));
            
            if (state === 'open') {
              updateSystemHealth();
            }
          }
        });
        
        setState(prev => ({
          ...prev,
          circuitBreakerStates: {
            ...prev.circuitBreakerStates,
            [name]: breaker.getCurrentState()
          }
        }));
      });
    }
    
    console.log('[ErrorProvider] Error handling initialized');
  };
  
  const reportError = (error: Error, context?: Partial<ErrorContext>): string => {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const errorSummary: ErrorSummary = {
      id: errorId,
      timestamp: Date.now(),
      type: error instanceof BaseError ? error.code : error.name,
      message: error.message,
      severity: error instanceof BaseError ? error.severity : ErrorSeverity.MEDIUM,
      component: context?.component,
      feature: context?.feature,
      resolved: false
    };
    
    setState(prev => ({
      ...prev,
      totalErrors: prev.totalErrors + 1,
      recentErrors: [errorSummary, ...prev.recentErrors.slice(0, 49)], // Keep last 50 errors
      errorsByType: {
        ...prev.errorsByType,
        [errorSummary.type]: (prev.errorsByType[errorSummary.type] || 0) + 1
      }
    }));
    
    // Log to console and external services
    errorUtils.logError(error, context?.component || context?.feature);
    
    // Send to async error handler for additional processing
    asyncErrorHandler.captureError(error, context);
    
    // Show user notification if enabled and error is user-facing
    if (state.errorNotificationsEnabled && shouldShowNotification(error)) {
      const userMessage = errorUtils.getUserMessage(error);
      toast.push('error', userMessage, 5000);
    }
    
    updateSystemHealth();
    
    return errorId;
  };
  
  const reportWarning = (message: string, context?: Partial<ErrorContext>) => {
    const warning = new BaseError(message, ErrorCode.UNKNOWN_ERROR, ErrorSeverity.LOW, false);
    reportError(warning, context);
  };
  
  const reportInfo = (message: string, context?: Partial<ErrorContext>) => {
    asyncErrorHandler.captureMessage(message, 'info', context);
  };
  
  const shouldShowNotification = (error: Error): boolean => {
    // Don't show notifications for low severity errors
    if (error instanceof BaseError && error.severity === ErrorSeverity.LOW) {
      return false;
    }
    
    // Don't show for certain error types that are handled elsewhere
    const silentErrors = ['ValidationError', 'UserError'];
    if (silentErrors.includes(error.name)) {
      return false;
    }
    
    return true;
  };
  
  const retryLastOperation = async (): Promise<void> => {
    if (!lastOperation) {
      toast.push('warning', 'No operation to retry', 3000);
      return;
    }
    
    try {
      await lastOperation.operation();
      toast.push('success', 'Operation completed successfully', 3000);
      setLastOperation(null);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      reportError(err, { component: 'RetryOperation', userAction: lastOperation.context });
    }
  };
  
  const clearErrorHistory = () => {
    setState(prev => ({
      ...prev,
      recentErrors: [],
      errorsByType: {},
      totalErrors: 0
    }));
    
    if (enableAsyncErrorHandling) {
      asyncErrorHandler.clearErrorHistory();
    }
    
    if (enableRetryManager) {
      retryManager.resetStats();
    }
  };
  
  const markErrorResolved = (errorId: string) => {
    setState(prev => ({
      ...prev,
      recentErrors: prev.recentErrors.map(error =>
        error.id === errorId ? { ...error, resolved: true } : error
      )
    }));
  };
  
  const checkSystemHealth = async (): Promise<void> => {
    const now = Date.now();
    
    // Check circuit breaker states
    const breakerStats = circuitBreakerRegistry.getAllStats();
    const openBreakers = Object.values(breakerStats).filter(stat => stat.state === 'open').length;
    
    // Check recent error rate
    const recentErrors = state.recentErrors.filter(error => 
      now - error.timestamp < 300000 && // Last 5 minutes
      !error.resolved &&
      error.severity !== ErrorSeverity.LOW
    ).length;
    
    // Determine system health
    let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (openBreakers > 2 || recentErrors > 10) {
      health = 'critical';
    } else if (openBreakers > 0 || recentErrors > 5) {
      health = 'degraded';
    }
    
    setState(prev => ({
      ...prev,
      systemHealth: health,
      lastHealthCheck: now
    }));
    
    // Alert if system health is degraded
    if (health !== 'healthy' && state.systemHealth === 'healthy') {
      if (state.errorNotificationsEnabled) {
        toast.push(
          health === 'critical' ? 'error' : 'warning',
          `System health is ${health}. Some features may be unavailable.`,
          0 // Don't auto-dismiss
        );
      }
    }
  };
  
  const getCircuitBreakerStatus = (serviceName: string): string => {
    return state.circuitBreakerStates[serviceName] || 'unknown';
  };
  
  const resetCircuitBreaker = (serviceName: string) => {
    const breaker = circuitBreakerRegistry.get(serviceName);
    if (breaker) {
      breaker.reset();
      toast.push('info', `${serviceName} circuit breaker reset`, 3000);
    }
  };
  
  const updateSystemHealth = () => {
    // Trigger health check after a short delay to batch updates
    setTimeout(checkSystemHealth, 100);
  };
  
  const toggleErrorNotifications = () => {
    setState(prev => ({
      ...prev,
      errorNotificationsEnabled: !prev.errorNotificationsEnabled
    }));
  };
  
  const toggleDebugMode = () => {
    setState(prev => ({
      ...prev,
      debugMode: !prev.debugMode
    }));
  };
  
  const createRetryableFunction = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationType: string
  ): T => {
    if (!enableRetryManager) {
      return fn;
    }
    
    return ((...args: Parameters<T>) => {
      const operation = () => fn(...args);
      setLastOperation({ operation, context: operationType });
      
      return retryManager.executeWithRetry(operation, operationType, {
        onRetry: (attempt, error, delay) => {
          if (state.debugMode) {
            console.log(`[RetryableFunction] ${operationType} attempt ${attempt} failed, retrying in ${delay}ms`);
          }
        },
        onMaxAttempts: (error) => {
          reportError(error, { component: 'RetryableFunction', feature: operationType });
        }
      });
    }) as T;
  };
  
  const executeWithCircuitBreaker = async <T,>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    if (!enableCircuitBreakers) {
      return operation();
    }
    
    const breaker = circuitBreakerRegistry.get(serviceName);
    if (!breaker) {
      throw new Error(`Circuit breaker not found for service: ${serviceName}`);
    }
    
    setLastOperation({ operation, context: serviceName });
    
    try {
      return await breaker.execute(operation);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      reportError(err, { component: 'CircuitBreaker', feature: serviceName });
      throw error;
    }
  };
  
  const contextValue: ErrorContextValue = {
    state,
    reportError,
    reportWarning,
    reportInfo,
    retryLastOperation,
    clearErrorHistory,
    markErrorResolved,
    checkSystemHealth,
    getCircuitBreakerStatus,
    resetCircuitBreaker,
    toggleErrorNotifications,
    toggleDebugMode,
    createRetryableFunction,
    executeWithCircuitBreaker
  };
  
  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

// Hook for simplified error reporting
export const useErrorReporting = () => {
  const { reportError, reportWarning, reportInfo } = useErrorHandler();
  
  return {
    reportError,
    reportWarning,
    reportInfo,
    
    // Convenience methods
    reportApiError: (error: Error, endpoint: string) => 
      reportError(error, { component: 'ApiClient', feature: endpoint }),
      
    reportComponentError: (error: Error, componentName: string) =>
      reportError(error, { component: componentName }),
      
    reportUserAction: (error: Error, action: string) =>
      reportError(error, { userAction: action })
  };
};

// Hook for circuit breaker operations
export const useCircuitBreaker = () => {
  const { executeWithCircuitBreaker, getCircuitBreakerStatus, resetCircuitBreaker } = useErrorHandler();
  
  return {
    executeWithCircuitBreaker,
    getCircuitBreakerStatus,
    resetCircuitBreaker,
    
    // Service-specific methods
    executeWithRunningHubAPI: <T,>(operation: () => Promise<T>) =>
      executeWithCircuitBreaker('runninghub_api', operation),
      
    executeWithDatabase: <T,>(operation: () => Promise<T>) =>
      executeWithCircuitBreaker('database', operation),
      
    executeWithPaymentGateway: <T,>(operation: () => Promise<T>) =>
      executeWithCircuitBreaker('payment_gateway', operation)
  };
};

// Hook for retry operations
export const useRetry = () => {
  const { createRetryableFunction, retryLastOperation } = useErrorHandler();
  
  return {
    createRetryableFunction,
    retryLastOperation,
    
    // Pre-configured retryable functions
    createRetryableApiCall: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
      createRetryableFunction(fn, 'api_call'),
      
    createRetryableUpload: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
      createRetryableFunction(fn, 'file_upload'),
      
    createRetryableProcessing: <T extends (...args: any[]) => Promise<any>>(fn: T) =>
      createRetryableFunction(fn, 'ai_processing')
  };
};

export default ErrorContext;
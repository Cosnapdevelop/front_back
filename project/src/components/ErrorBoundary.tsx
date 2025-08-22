import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Wifi, WifiOff, MessageCircle, RotateCcw, FileX, Zap, Shield } from 'lucide-react';
import { BaseError, ErrorCode, ErrorSeverity } from '../types/errors';

export interface ErrorBoundaryConfig {
  level: 'page' | 'feature' | 'component';
  feature?: string;
  contextInfo?: Record<string, any>;
  enableRetry?: boolean;
  enableReporting?: boolean;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  onRetry?: () => void | Promise<void>;
}

interface RecoveryAction {
  id: string;
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
  estimatedTime?: string;
  shortcut?: string;
}

interface ErrorClassification {
  type: 'network' | 'validation' | 'authentication' | 'processing' | 'system' | 'business';
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  technicalMessage?: string;
  recoveryActions: RecoveryAction[];
  helpLink?: string;
  preventionTip?: string;
}

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  config?: ErrorBoundaryConfig;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  isRetrying: boolean;
  classification?: ErrorClassification;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;
  private stateChangeListeners: Array<(state: any) => void> = [];
  
  public state: State = {
    hasError: false,
    retryCount: 0,
    isRetrying: false
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId,
      retryCount: 0,
      isRetrying: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const classification = this.classifyError(error);
    
    console.error(`[ErrorBoundary:${errorId}] Error caught:`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      level: this.props.config?.level || 'component',
      feature: this.props.config?.feature,
      contextInfo: this.props.config?.contextInfo,
      classification
    });
    
    this.setState({
      error,
      errorInfo,
      errorId,
      classification
    });

    // Report to monitoring service with business context
    this.reportError(error, errorInfo, errorId, classification);
    
    // Notify parent component
    this.props.config?.onError?.(error, errorInfo, errorId);
    
    // Notify state change listeners
    this.stateChangeListeners.forEach(listener => {
      try {
        listener({ hasError: true, error, errorId, classification });
      } catch (listenerError) {
        console.warn('[ErrorBoundary] State change listener error:', listenerError);
      }
    });
  }

  private classifyError = (error: Error): ErrorClassification => {
    // Check if it's our custom error type
    if (error instanceof BaseError) {
      return this.getClassificationFromBaseError(error);
    }
    
    // Classify based on error patterns
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    
    if (name.includes('chunckloaderror') || message.includes('loading chunk')) {
      return {
        type: 'system',
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        userMessage: 'Application update detected. Please refresh to get the latest version.',
        recoveryActions: [{
          id: 'refresh',
          label: 'Refresh Page',
          action: this.handleRefresh,
          primary: true,
          icon: RefreshCw,
          shortcut: 'Enter'
        }],
        helpLink: '/help/app-updates'
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: 'network',
        severity: ErrorSeverity.HIGH,
        recoverable: true,
        userMessage: 'Connection issue detected. Please check your internet connection.',
        recoveryActions: [
          {
            id: 'retry',
            label: 'Try Again',
            action: this.handleRetry,
            primary: true,
            icon: RotateCcw,
            shortcut: 'Enter'
          },
          {
            id: 'check_connection',
            label: 'Check Connection',
            action: () => window.open('https://www.google.com', '_blank'),
            icon: Wifi
          }
        ],
        preventionTip: 'Ensure stable internet connection for best experience'
      };
    }
    
    // Default classification for unknown errors
    return {
      type: 'system',
      severity: ErrorSeverity.HIGH,
      recoverable: true,
      userMessage: 'Something unexpected happened. Don\'t worry, you can try again.',
      technicalMessage: `${error.name}: ${error.message}`,
      recoveryActions: [
        {
          id: 'retry',
          label: 'Try Again',
          action: this.handleRetry,
          primary: true,
          icon: RotateCcw,
          shortcut: 'Enter'
        },
        {
          id: 'refresh',
          label: 'Refresh Page',
          action: this.handleRefresh,
          icon: RefreshCw
        },
        {
          id: 'home',
          label: 'Go Home',
          action: this.handleGoHome,
          icon: Home
        },
        {
          id: 'support',
          label: 'Contact Support',
          action: this.handleContactSupport,
          icon: MessageCircle
        }
      ]
    };
  };
  
  private getClassificationFromBaseError = (error: BaseError): ErrorClassification => {
    const baseActions: RecoveryAction[] = [];
    
    if (error.retryable) {
      baseActions.push({
        id: 'retry',
        label: 'Try Again',
        action: this.handleRetry,
        primary: true,
        icon: RotateCcw,
        shortcut: 'Enter'
      });
    }
    
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        return {
          type: 'network',
          severity: error.severity,
          recoverable: error.retryable,
          userMessage: 'Network connection failed. Please check your internet connection.',
          recoveryActions: [
            ...baseActions,
            {
              id: 'check_connection',
              label: 'Check Connection',
              action: () => window.open('https://www.google.com', '_blank'),
              icon: Wifi
            }
          ],
          preventionTip: 'Use stable Wi-Fi for better reliability'
        };
        
      case ErrorCode.FILE_TOO_LARGE:
        return {
          type: 'validation',
          severity: error.severity,
          recoverable: true,
          userMessage: 'Image is too large. Please choose a smaller file or compress it.',
          recoveryActions: [
            {
              id: 'compress',
              label: 'Compress Image',
              action: this.handleCompressImage,
              primary: true,
              icon: Zap,
              estimatedTime: '15 seconds'
            },
            {
              id: 'choose_different',
              label: 'Choose Different Image',
              action: this.handleChooseDifferent,
              icon: FileX
            }
          ],
          helpLink: '/help/image-requirements',
          preventionTip: 'Images under 10MB process faster'
        };
        
      case ErrorCode.TASK_TIMEOUT:
        return {
          type: 'processing',
          severity: error.severity,
          recoverable: true,
          userMessage: 'AI processing took longer than expected. This sometimes happens with complex images.',
          recoveryActions: [
            {
              id: 'retry_lower_quality',
              label: 'Try with Lower Quality',
              action: this.handleRetryLowerQuality,
              primary: true,
              icon: RotateCcw,
              estimatedTime: '30 seconds'
            },
            ...baseActions
          ],
          helpLink: '/help/processing-timeouts'
        };
        
      default:
        return {
          type: 'system',
          severity: error.severity,
          recoverable: error.retryable,
          userMessage: error.message,
          recoveryActions: baseActions
        };
    }
  };
  
  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string, classification: ErrorClassification) => {
    if (!this.props.config?.enableReporting) return;
    
    const reportData = {
      errorId,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      classification,
      boundaryConfig: {
        level: this.props.config?.level,
        feature: this.props.config?.feature,
        contextInfo: this.props.config?.contextInfo
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };
    
    // Send to monitoring service (Sentry, custom analytics, etc.)
    if (typeof window !== 'undefined' && (window as any).errorTrackingService) {
      (window as any).errorTrackingService.logError('ErrorBoundary Error', error, reportData);
    }
    
    console.log('[ErrorBoundary] Error reported:', reportData);
  };
  
  private handleRetry = async () => {
    const maxRetries = this.props.config?.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn(`[ErrorBoundary] Max retries (${maxRetries}) reached`);
      return;
    }
    
    this.setState({ isRetrying: true });
    
    try {
      await this.props.config?.onRetry?.();
      
      // Reset error state after successful retry
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1,
        isRetrying: false,
        classification: undefined
      });
    } catch (retryError) {
      console.error('[ErrorBoundary] Retry failed:', retryError);
      this.setState({ 
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    }
  };
  
  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };
  
  private handleContactSupport = () => {
    const errorId = this.state.errorId;
    const subject = encodeURIComponent(`Error Report - ${errorId}`);
    const body = encodeURIComponent(`I encountered an error in Cosnap AI.\n\nError ID: ${errorId}\nPage: ${window.location.href}\nTime: ${new Date().toISOString()}\n\nPlease help me resolve this issue.`);
    window.open(`mailto:support@cosnap.ai?subject=${subject}&body=${body}`);
  };
  
  private handleCompressImage = () => {
    // This would integrate with image compression service
    console.log('[ErrorBoundary] Compress image action triggered');
    // Implementation would depend on the image compression service
  };
  
  private handleChooseDifferent = () => {
    // This would trigger file selector
    console.log('[ErrorBoundary] Choose different image action triggered');
  };
  
  private handleRetryLowerQuality = () => {
    console.log('[ErrorBoundary] Retry with lower quality action triggered');
    // Implementation would set quality parameters and retry
  };

  public render() {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return this.renderEnhancedErrorUI();
    }

    return this.props.children;
  }
  
  private renderEnhancedErrorUI = () => {
    const { classification, errorId, retryCount, isRetrying } = this.state;
    const { config } = this.props;
    const isPageLevel = config?.level === 'page';
    const maxRetries = config?.maxRetries || 3;
    
    const containerClass = isPageLevel 
      ? "min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4"
      : "w-full bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center";
    
    const cardClass = isPageLevel
      ? "max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8"
      : "w-full";
    
    const getSeverityColor = () => {
      switch (classification?.severity) {
        case ErrorSeverity.CRITICAL:
          return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
        case ErrorSeverity.HIGH:
          return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20';
        case ErrorSeverity.MEDIUM:
          return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
        default:
          return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      }
    };
    
    const getTypeIcon = () => {
      switch (classification?.type) {
        case 'network':
          return <WifiOff className="w-8 h-8" />;
        case 'validation':
          return <FileX className="w-8 h-8" />;
        case 'processing':
          return <Zap className="w-8 h-8" />;
        case 'authentication':
          return <Shield className="w-8 h-8" />;
        default:
          return <AlertTriangle className="w-8 h-8" />;
      }
    };
    
    return (
      <div className={containerClass}>
        <div className={cardClass}>
          <div className="text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getSeverityColor()}`}>
                {getTypeIcon()}
              </div>
            </div>
            
            {/* Error Title */}
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {this.getErrorTitle()}
            </h1>
            
            {/* Error Message */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {classification?.userMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            
            {/* Retry Count Display */}
            {retryCount > 0 && (
              <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Attempt {retryCount} of {maxRetries}
              </div>
            )}
            
            {/* Recovery Actions */}
            <div className="space-y-3 mb-6">
              {classification?.recoveryActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => action.action()}
                  disabled={action.disabled || isRetrying || (action.id === 'retry' && retryCount >= maxRetries)}
                  className={`w-full font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    action.primary
                      ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400'
                  } disabled:cursor-not-allowed`}
                >
                  {isRetrying && action.id === 'retry' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    action.icon && <action.icon className="w-4 h-4" />
                  )}
                  <span>
                    {isRetrying && action.id === 'retry' ? 'Retrying...' : action.label}
                    {action.estimatedTime && ` (${action.estimatedTime})`}
                  </span>
                  {action.shortcut && (
                    <span className="text-xs bg-white/20 px-1 rounded">{action.shortcut}</span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Help Link */}
            {classification?.helpLink && (
              <div className="mb-4">
                <a
                  href={classification.helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Learn more about this error →
                </a>
              </div>
            )}
            
            {/* Prevention Tip */}
            {classification?.preventionTip && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 {classification.preventionTip}
                </p>
              </div>
            )}
            
            {/* Error ID for Support */}
            {errorId && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Error ID: {errorId}
              </div>
            )}
            
            {/* Development Error Details - Extra security checks */}
            {this.isDevelopmentMode() && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Technical Details (Development Only)
                </summary>
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-xs font-mono max-h-48 overflow-auto">
                  <div className="text-red-600 dark:text-red-400 mb-2">
                    {this.state.error.name}: {this.sanitizeErrorMessage(this.state.error.message)}
                  </div>
                  {classification?.technicalMessage && (
                    <div className="text-orange-600 dark:text-orange-400 mb-2">
                      Classification: {this.sanitizeErrorMessage(classification.technicalMessage)}
                    </div>
                  )}
                  <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {this.sanitizeStackTrace(this.state.error.stack)}
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                      <div className="text-blue-600 dark:text-blue-400 mb-1">Component Stack:</div>
                      <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-xs">
                        {this.sanitizeStackTrace(this.state.errorInfo.componentStack)}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  private getErrorTitle = (): string => {
    const { classification } = this.state;
    
    if (!classification) return 'Something went wrong';
    
    switch (classification.type) {
      case 'network':
        return 'Connection Issue';
      case 'validation':
        return 'Invalid Input';
      case 'processing':
        return 'Processing Failed';
      case 'authentication':
        return 'Authentication Error';
      case 'business':
        return 'Service Unavailable';
      default:
        return 'Unexpected Error';
    }
  };
  
  // Public method to register state change listeners
  public onStateChange = (listener: (state: any) => void): (() => void) => {
    this.stateChangeListeners.push(listener);
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  };
  
  // Security helper methods
  private isDevelopmentMode = (): boolean => {
    // Multiple checks to ensure we're truly in development
    return (
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.includes('.local'))
    );
  };
  
  private sanitizeErrorMessage = (message: string): string => {
    if (!message) return 'Unknown error';
    
    // Remove potentially sensitive information
    return message
      .replace(/\b(?:token|password|secret|key|auth|session|credential)\s*[=:]\s*\S+/gi, '[REDACTED]')
      .replace(/\b[A-Za-z0-9+/]{32,}={0,2}\b/g, '[REDACTED]') // Base64 patterns
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]') // UUIDs
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]') // IP addresses
      .substring(0, 500); // Limit length
  };
  
  private sanitizeStackTrace = (stackTrace?: string): string => {
    if (!stackTrace) return 'No stack trace available';
    
    // Remove absolute file paths and keep only relative ones
    return stackTrace
      .replace(/\s+at\s+.*?(\/.*?\/.*?\/)/g, ' at [PATH]/') // Unix paths
      .replace(/\s+at\s+.*?([C-Z]:\\.*?\\.*?\\)/g, ' at [PATH]\\') // Windows paths
      .replace(/\b(?:token|password|secret|key|auth|session|credential)\s*[=:]\s*\S+/gi, '[REDACTED]')
      .substring(0, 2000); // Limit length
  };
  
  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    
    // Clear all event listeners to prevent memory leaks
    this.stateChangeListeners.length = 0;
  }
}

// Specialized error boundaries for different features
export const AIProcessingErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    config={{
      level: 'feature',
      feature: 'ai_processing',
      enableRetry: true,
      enableReporting: true,
      maxRetries: 2,
      onRetry: async () => {
        // Custom retry logic for AI processing
        console.log('[AIProcessingErrorBoundary] Retrying AI processing...');
      }
    }}
  >
    {children}
  </ErrorBoundary>
);

export const FileUploadErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    config={{
      level: 'feature',
      feature: 'file_upload',
      enableRetry: true,
      enableReporting: true,
      maxRetries: 3,
      onRetry: async () => {
        console.log('[FileUploadErrorBoundary] Retrying file upload...');
      }
    }}
  >
    {children}
  </ErrorBoundary>
);

export const PaymentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    config={{
      level: 'feature',
      feature: 'payment',
      enableRetry: false,
      enableReporting: true,
      onError: (error, errorInfo, errorId) => {
        // Special handling for payment errors
        console.error('[PaymentErrorBoundary] Critical payment error:', { error, errorInfo, errorId });
      }
    }}
  >
    {children}
  </ErrorBoundary>
);

export const AuthErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    config={{
      level: 'feature',
      feature: 'authentication',
      enableRetry: true,
      enableReporting: true,
      maxRetries: 1
    }}
  >
    {children}
  </ErrorBoundary>
);

// Higher-order component for wrapping page components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  config?: ErrorBoundaryConfig
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary config={{ level: 'page', ...config }}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for error boundary context
export const useErrorBoundary = () => {
  return {
    captureError: (error: Error, context?: string) => {
      // This will be caught by the nearest error boundary
      setTimeout(() => {
        throw error;
      }, 0);
    },
    reportError: (error: Error, context?: Record<string, any>) => {
      if (typeof window !== 'undefined' && (window as any).errorTrackingService) {
        (window as any).errorTrackingService.logError('Manual Error Report', error, context);
      }
    }
  };
};

export default ErrorBoundary;